import importlib
from typing import List, Optional
from services.gee_service import gee_service
from services.clustering_service import run_dbscan_clustering
from services.fusion_service import calculate_fusion_score
from services.pipeline_runner import enrich_report_pipeline

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
        background_tasks.add_task(enrich_report_pipeline, report_id)
        return {"message": f"Enrichment pipeline queued for report {report_id}", "reportId": report_id, "status": "QUEUED"}

    @app.post("/cluster")
    def execute_clustering(req: ClusterRequest):
        points = [p.dict() for p in req.reports]
        return {"totalPoints": len(points), "clusterCount": len(run_dbscan_clustering(points)), "clusters": run_dbscan_clustering(points)}

    @app.post("/fuse")
    def execute_fusion(req: FusionRequest):
        return calculate_fusion_score(req.severityLevel, req.heatIndexC, req.satelliteLSTC)

if __name__ == "__main__":
    try:
        uvicorn = importlib.import_module("uvicorn")
        uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
    except Exception:
        print("[ML Microservice] Run 'pip install -r requirements.txt' to start uvicorn server.")
