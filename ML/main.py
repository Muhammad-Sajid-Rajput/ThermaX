import importlib
from typing import List, Optional
from services.gee_service import gee_service
from services.clustering_service import run_dbscan_clustering
from services.fusion_service import calculate_fusion_score
from worker import dispatch_enrichment, dispatch_clustering

try:
    fastapi_mod = importlib.import_module("fastapi")
    pydantic_mod = importlib.import_module("pydantic")
    FastAPI, BackgroundTasks = fastapi_mod.FastAPI, fastapi_mod.BackgroundTasks
    BaseModel = pydantic_mod.BaseModel
except Exception:
    FastAPI = None

if FastAPI:
    app = FastAPI(title="ThermaX ML Microservice API", version="1.0.0")

    class ReportPoint(BaseModel):
        id: str
        lat: float
        lng: float
        temp: Optional[float] = 40.0

    class ClusterRequest(BaseModel):
        reports: List[ReportPoint]

    class FusionRequest(BaseModel):
        severityLevel: float
        heatIndexC: float
        satelliteLSTC: float

    @app.get("/health")
    def health_check():
        return {"status": "OK", "service": "ThermaX ML Microservice", "version": "1.0.0", "geeAvailable": gee_service.gee_available}

    @app.post("/enrich/report/{report_id}")
    def enrich_report(report_id: str, background_tasks: BackgroundTasks):
        background_tasks.add_task(dispatch_enrichment, report_id)
        return {"message": f"Enrichment pipeline task queued for report {report_id}", "reportId": report_id, "status": "QUEUED"}

    @app.post("/cluster")
    def execute_clustering(req: ClusterRequest):
        points = [p.dict() for p in req.reports]
        return {"totalPoints": len(points), "clusterCount": len(run_dbscan_clustering(points)), "clusters": run_dbscan_clustering(points)}

    @app.post("/cluster/run")
    def run_scheduled_clustering(city: str = "Karachi"):
        dispatch_clustering(city)
        return {"message": f"Periodic DBSCAN clustering task dispatched for {city}", "status": "QUEUED"}

    @app.post("/fuse")
    def execute_fusion(req: FusionRequest):
        return calculate_fusion_score(req.severityLevel, req.heatIndexC, req.satelliteLSTC)

# ── Standalone Built-in HTTP Server Fallback (Zero External Dependencies) ────
else:
    import json
    import re
    from http.server import HTTPServer, BaseHTTPRequestHandler

    class MLHTTPHandler(BaseHTTPRequestHandler):
        def _send_json(self, data, status=200):
            response = json.dumps(data).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(response)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.end_headers()
            self.wfile.write(response)

        def do_OPTIONS(self):
            self._send_json({"status": "OK"})

        def do_GET(self):
            if self.path == "/health" or self.path == "/":
                self._send_json({
                    "status": "OK",
                    "service": "ThermaX ML Microservice",
                    "version": "1.0.0",
                    "geeAvailable": gee_service.gee_available,
                    "server": "Standard HTTP"
                })
            else:
                self._send_json({"error": "Not Found"}, 404)

        def do_POST(self):
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8") if content_length > 0 else "{}"
            try:
                payload = json.loads(body) if body else {}
            except Exception:
                payload = {}

            # /enrich/report/{report_id}
            enrich_match = re.match(r"^/enrich/report/([^/?]+)", self.path)
            if enrich_match:
                report_id = enrich_match.group(1)
                dispatch_enrichment(report_id)
                self._send_json({
                    "message": f"Enrichment pipeline task queued for report {report_id}",
                    "reportId": report_id,
                    "status": "QUEUED"
                })
                return

            # /cluster
            if self.path.startswith("/cluster/run"):
                city = payload.get("city", "Karachi")
                dispatch_clustering(city)
                self._send_json({"message": f"Periodic DBSCAN clustering task dispatched for {city}", "status": "QUEUED"})
                return

            if self.path.startswith("/cluster"):
                reports = payload.get("reports", [])
                clusters = run_dbscan_clustering(reports)
                self._send_json({
                    "totalPoints": len(reports),
                    "clusterCount": len(clusters),
                    "clusters": clusters
                })
                return

            # /fuse
            if self.path.startswith("/fuse"):
                sev = float(payload.get("severityLevel", 3.0))
                hi = float(payload.get("heatIndexC", 40.0))
                lst = float(payload.get("satelliteLSTC", 42.0))
                result = calculate_fusion_score(sev, hi, lst)
                self._send_json(result)
                return

            self._send_json({"error": "Endpoint Not Found"}, 404)

        def log_message(self, format, *args):
            print(f"[ML Server] {self.address_string()} - {format % args}")

if __name__ == "__main__":
    if FastAPI:
        try:
            uvicorn = importlib.import_module("uvicorn")
            print("[ML Microservice] Starting FastAPI Server via Uvicorn on http://0.0.0.0:8000")
            uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
        except Exception as e:
            print(f"[ML Microservice] Uvicorn startup fallback: {e}")
    else:
        print("[ML Microservice] Starting ThermaX ML Service on http://0.0.0.0:8000 (Built-in Server)")
        server = HTTPServer(("0.0.0.0", 8000), MLHTTPHandler)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            server.server_close()

