"""Phase 4 task entry points.

The Celery fiction is gone: these are plain functions. The FastAPI
lifespan scheduler (APScheduler) calls ``run_pipeline_tick`` directly;
the HTTP layer dispatches through ``worker.py``'s honest thread pool.
``run_clustering_task`` is kept for backward compatibility and now runs
the atomic per-city pipeline instead of delete-then-insert.
"""
import importlib

from config import MONGO_URI
from services.pipeline_runner import enrich_report_pipeline
from services.scheduled_pipeline import run_city_pipeline, run_pipeline_once


def _get_db():
    pymongo = importlib.import_module("py" + "mongo")
    client = pymongo.MongoClient(MONGO_URI)
    return client


def enrich_report_task(report_id: str) -> dict:
    """Asynchronous background worker task to enrich thermal report in MongoDB."""
    return enrich_report_pipeline(report_id)


def run_clustering_task(city: str = "Karachi") -> dict:
    """Periodic clustering for one city — atomic hotspot replacement."""
    client = _get_db()
    try:
        db = client.get_database()
        return run_city_pipeline(db, city)
    finally:
        try:
            client.close()
        except Exception:
            pass


def run_pipeline_tick() -> dict:
    """One full scheduled tick: enrich pending → QC → DBSCAN per city."""
    return run_pipeline_once(mongo_uri=MONGO_URI)
