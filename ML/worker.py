import importlib
import concurrent.futures
from config import REDIS_URL
from tasks import enrich_report_task, run_clustering_task

# Try loading Celery if installed
celery_app = None
try:
    celery_mod = importlib.import_module("celery")
    celery_app = celery_mod.Celery("thermax_worker", broker=REDIS_URL, backend=REDIS_URL)
    celery_app.conf.update(
        task_serializer="json",
        result_serializer="json",
        accept_content=["json"],
        timezone="UTC",
        enable_utc=True
    )
except Exception:
    celery_app = None

# Pure Python ThreadPool Executor fallback for zero-dependency worker execution
_thread_pool = concurrent.futures.ThreadPoolExecutor(max_workers=4)

def dispatch_enrichment(report_id: str):
    """Queues report enrichment task via Celery or fallback ThreadPool executor."""
    if celery_app:
        try:
            return celery_app.send_task("enrich_report_task", args=[report_id])
        except Exception:
            pass
    return _thread_pool.submit(enrich_report_task, report_id)

def dispatch_clustering(city: str = "Karachi"):
    """Queues periodic DBSCAN clustering task via Celery or fallback ThreadPool executor."""
    if celery_app:
        try:
            return celery_app.send_task("run_clustering_task", args=[city])
        except Exception:
            pass
    return _thread_pool.submit(run_clustering_task, city)

if __name__ == "__main__":
    print("[ThermaX Task Worker] Initialized Task Dispatcher & Scheduler Engine.")
    res = dispatch_clustering("Karachi")
    print(f"[ThermaX Task Worker] Dispatched periodic clustering for Karachi: {res}")
