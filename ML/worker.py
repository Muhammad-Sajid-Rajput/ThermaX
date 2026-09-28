"""Honest background dispatcher: a plain ThreadPoolExecutor.

There is no Celery here anymore (it was never wired up — the broker,
the task registry, and the worker process were all fictional). Work is
submitted to a small local thread pool; the APScheduler tick in main.py
is the real periodic driver.
"""
import concurrent.futures

from tasks import enrich_report_task, run_clustering_task, run_pipeline_tick

_thread_pool = concurrent.futures.ThreadPoolExecutor(max_workers=4)


def dispatch_enrichment(report_id: str):
    """Queue report enrichment without blocking the caller."""
    return _thread_pool.submit(enrich_report_task, report_id)


def dispatch_clustering(city: str = "Karachi"):
    """Queue a single-city clustering run without blocking the caller."""
    return _thread_pool.submit(run_clustering_task, city)


def dispatch_pipeline_tick():
    """Queue a full scheduled tick (all cities) without blocking."""
    return _thread_pool.submit(run_pipeline_tick)


if __name__ == "__main__":
    print("[ThermaX Task Worker] ThreadPool dispatcher ready.")
    print("[ThermaX Task Worker] Periodic ticks run inside the ML service via APScheduler.")
