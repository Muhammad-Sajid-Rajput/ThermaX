"""ThermaX ML microservice — Phase 4.

- APScheduler (in FastAPI lifespan) runs the full pipeline tick every
  PIPELINE_INTERVAL_MINUTES: enrich pending → QC → DBSCAN per city →
  atomic hotspot replacement.
- Every endpoint except /health requires the shared service key
  (X-Service-Key header) whenever ML_SERVICE_KEY is configured.
- In-memory sliding-window rate limit: 100 req/min per IP → 429.
- JSON body guard: payloads over ML_MAX_BODY_BYTES → 413.
"""
import importlib
import hmac
import time
from contextlib import asynccontextmanager
from typing import List, Optional

from config import (
    ENV_NAME,
    ML_MAX_BODY_BYTES,
    ML_RATE_LIMIT_PER_MINUTE,
    ML_SERVICE_KEY,
    PIPELINE_INTERVAL_MINUTES,
    PORT,
)
from services.gee_service import gee_service
from services.clustering_service import run_dbscan_clustering
from services.fusion_service import calculate_fusion_score
from worker import dispatch_enrichment, dispatch_clustering, dispatch_pipeline_tick

try:
    fastapi_mod = importlib.import_module("fastapi")
    pydantic_mod = importlib.import_module("pydantic")
    FastAPI = fastapi_mod.FastAPI
    BackgroundTasks = fastapi_mod.BackgroundTasks
    Request = fastapi_mod.Request
    HTTPException = fastapi_mod.exceptions.HTTPException
    JSONResponse = fastapi_mod.responses.JSONResponse
    BaseModel = pydantic_mod.BaseModel
except Exception:
    FastAPI = None

# ── in-memory sliding-window rate limiter (per client IP) ──
_rate_buckets: dict = {}


def _rate_limit_ok(client_ip: str) -> bool:
    now = time.monotonic()
    window_start = now - 60.0
    bucket = _rate_buckets.get(client_ip)
    if bucket is None:
        bucket = []
        _rate_buckets[client_ip] = bucket
    # Drop timestamps outside the window (in place, cheap for small buckets).
    while bucket and bucket[0] <= window_start:
        bucket.pop(0)
    if len(bucket) >= ML_RATE_LIMIT_PER_MINUTE:
        return False
    bucket.append(now)
    # Opportunistic cleanup so idle IPs don't accumulate forever.
    if len(_rate_buckets) > 10000:
        _rate_buckets.clear()
    return True


if FastAPI:
    @asynccontextmanager
    async def lifespan(app):
        # Fail fast before doing any work: production must never boot with
        # open ML endpoints. Controlled test/development behavior (open
        # endpoints) is preserved.
        if ML_SERVICE_KEY:
            print("[ML] Service-key auth enabled on /enrich, /cluster, /fuse.")
        elif ENV_NAME == "production":
            raise RuntimeError(
                "FATAL: ML_SERVICE_KEY is not set in production — "
                "refusing to boot with open ML endpoints."
            )
        else:
            print("[ML] WARNING: ML_SERVICE_KEY is not set — endpoints are open.")
        # The real scheduler: a boring, working APScheduler tick.
        # First tick 60s after boot (lets the service settle), then every
        # PIPELINE_INTERVAL_MINUTES. Imported lazily like everything else.
        scheduler = None
        try:
            apsched = importlib.import_module("apscheduler.schedulers.background")
            scheduler = apsched.BackgroundScheduler()
            scheduler.add_job(
                _scheduled_tick,
                "interval",
                minutes=PIPELINE_INTERVAL_MINUTES,
                next_run_time=_next_run_time(60),
                id="thermax-pipeline-tick",
                max_instances=1,
                coalesce=True,
            )
            scheduler.start()
            print(
                f"[ML] APScheduler started: pipeline tick every "
                f"{PIPELINE_INTERVAL_MINUTES} min."
            )
        except Exception as exc:
            print(f"[ML] Scheduler failed to start ({exc}); /cluster/run still works.")
        yield
        if scheduler is not None:
            scheduler.shutdown(wait=False)

    app = FastAPI(
        title="ThermaX ML Microservice API",
        version="1.0.0",
        lifespan=lifespan,
    )

    # ── body-size guard: 413 before the app ever parses a huge payload ──
    @app.middleware("http")
    async def body_size_guard(request: Request, call_next):
        if request.url.path != "/health":
            declared = request.headers.get("content-length")
            if declared is not None:
                try:
                    if int(declared) > ML_MAX_BODY_BYTES:
                        return JSONResponse(
                            status_code=413,
                            content={"error": "Payload too large"},
                        )
                except ValueError:
                    pass
            else:
                # Chunked / unknown length: count while reading.
                total = 0
                original_receive = request._receive

                async def counting_receive():
                    nonlocal total
                    message = await original_receive()
                    chunk = message.get("body", b"")
                    total += len(chunk)
                    if total > ML_MAX_BODY_BYTES:
                        raise _BodyTooLarge()
                    return message

                request._receive = counting_receive
                try:
                    return await call_next(request)
                except _BodyTooLarge:
                    return JSONResponse(
                        status_code=413, content={"error": "Payload too large"}
                    )
        return await call_next(request)

    # ── rate limiting: 429 past ML_RATE_LIMIT_PER_MINUTE per IP ──
    @app.middleware("http")
    async def rate_limit_middleware(request: Request, call_next):
        if request.url.path not in ("/health", "/docs", "/openapi.json"):
            client_ip = request.client.host if request.client else "unknown"
            if not _rate_limit_ok(client_ip):
                return JSONResponse(
                    status_code=429,
                    content={"error": "Rate limit exceeded. Try again in a minute."},
                )
        return await call_next(request)

    def _require_service_key(request: Request):
        """Shared-secret auth for backend→ML calls.

        Enforced only when ML_SERVICE_KEY is configured; local dev without
        the key stays open (startup logs a warning). /health is public.
        """
        if not ML_SERVICE_KEY:
            return
        presented = request.headers.get("x-service-key", "")
        if not hmac.compare_digest(presented, ML_SERVICE_KEY):
            raise HTTPException(status_code=401, detail="Invalid service key")

    class ReportPoint(BaseModel):
        id: str
        lat: float
        lng: float
        temp: Optional[float] = None

    class ClusterRequest(BaseModel):
        reports: List[ReportPoint]

    class FusionRequest(BaseModel):
        severityLevel: float
        heatIndexC: Optional[float] = None
        satelliteLSTC: Optional[float] = None

    @app.get("/health")
    def health_check():
        return {"status": "OK", "service": "ThermaX ML Microservice", "version": "1.0.0", "geeAvailable": gee_service.gee_available}

    @app.post("/enrich/report/{report_id}")
    def enrich_report(report_id: str, background_tasks: BackgroundTasks, request: Request):
        _require_service_key(request)
        background_tasks.add_task(dispatch_enrichment, report_id)
        return {"message": f"Enrichment pipeline task queued for report {report_id}", "reportId": report_id, "status": "QUEUED"}

    @app.post("/cluster")
    def execute_clustering(req: ClusterRequest, request: Request):
        _require_service_key(request)
        points = [p.model_dump() if hasattr(p, "model_dump") else p.dict() for p in req.reports]
        clusters = run_dbscan_clustering(points)  # computed once, reused
        return {"totalPoints": len(points), "clusterCount": len(clusters), "clusters": clusters}

    @app.post("/cluster/run")
    def run_scheduled_clustering(request: Request, background_tasks: BackgroundTasks, city: Optional[str] = None):
        _require_service_key(request)
        if city:
            background_tasks.add_task(dispatch_clustering, city)
            return {"message": f"Clustering task queued for {city}", "status": "QUEUED"}
        dispatch_pipeline_tick()
        return {"message": "Full pipeline tick queued (all cities)", "status": "QUEUED"}

    @app.post("/fuse")
    def execute_fusion(req: FusionRequest, request: Request):
        _require_service_key(request)
        try:
            return calculate_fusion_score(req.severityLevel, req.heatIndexC, req.satelliteLSTC)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))


class _BodyTooLarge(Exception):
    """Internal signal: chunked body exceeded ML_MAX_BODY_BYTES."""


def _next_run_time(delay_seconds: int):
    import datetime
    return datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(seconds=delay_seconds)


def _scheduled_tick():
    """APScheduler target: one full pipeline tick, never raising."""
    try:
        from tasks import run_pipeline_tick
        summary = run_pipeline_tick()
        failed_cities = [c for c, s in summary.get("cities", {}).items() if s.get("status") != "COMPLETED"]
        print(f"[ML] tick done: enrichment={summary.get('enrichment')}, failed_cities={failed_cities}")
    except Exception as exc:
        print(f"[ML] scheduled tick failed: {exc}")


if __name__ == "__main__":
    try:
        uvicorn = importlib.import_module("uvicorn")
        uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
    except Exception:
        print("[ML Microservice] Run 'pip install -r requirements.txt' to start uvicorn server.")
