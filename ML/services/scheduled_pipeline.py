"""Phase 5 scheduled pipeline: one tick does everything, honestly.

Tick order:
  1. Enrich every ``pending`` report (weather + GEE + QC → verified/flagged).
     Each enrichment is idempotent; one bad report never aborts the tick.
     Reports whose enrichment FAILS are stamped with ``enrichmentFailedAt``
     (cleared on the next success) so a transient outage can never silently
     feed stale or unenriched data into the public map.
  2. For each city in ``config.CITY_NAMES``: DBSCAN over VERIFIED reports
     only — pending, QC-flagged, rejected, and enrichment-failed reports
     never feed the hotspot map. Clustering is per-city: a Karachi report
     can never join a Lahore cluster.
  3. TVI-lite scoring per hotspot (see services/tvi_service.py): the
     hotspot's mean member heatScore, its report count, and the static
     WorldPop population density at its centroid.
  4. READER-ATOMIC publication via a city-level current-run pointer
     (``hotspot_publications`` collection):
       insert the new run's docs → flip the pointer in ONE single-document
       upsert → retire runs older than the previous one.
     Readers resolve the pointer first, so they always see exactly one
     complete run. A crash between insert and flip leaves the previous
     complete run current (no gap); a crash after the flip leaves the new
     complete run current (no dupe); a crashed mid-insert run is never
     pointed at and is retired by the next tick.
  5. Phase 6 directives + advisories are attached per hotspot in
     ``score_clusters`` (via services/directives_service.py) BEFORE the
     atomic publication, so readers never see a hotspot without its
     directives/advisory. ``directives_hook`` remains as a post-publication
     extension point (unset).

Failure isolation: one bad report or one bad city is recorded in the
summary and the tick continues. Nothing here invents measurements.
"""
from collections import defaultdict
import datetime
import importlib
import threading
import uuid

from config import CITY_NAMES, MONGO_URI, INCLUDE_SYNTHETIC_REPORTS
from services.clustering_service import run_dbscan_clustering
from services.pipeline_runner import enrich_report_pipeline
from services.pop_grid import pop_density_at
from services.tvi_service import compute_tvi
from services.directives_service import attach_phase6

# Per-city lock prevents concurrent same-city runs from interleaving
# and blanking active hotspots (M-ML1 fix).
_city_locks = defaultdict(threading.Lock)

# Phase 6 extension point. It is invoked only when set, so the scheduler
# never changes when directives land.
directives_hook = None   # fn(db, city, run_id, scored_clusters) -> dict | None


def _utcnow():
    return datetime.datetime.now(datetime.timezone.utc)


def _get_db(mongo_uri=MONGO_URI):
    """Open a Mongo client. pymongo is imported lazily so tests can stub it
    with mongomock via sys.modules injection (same pattern as
    pipeline_runner)."""
    pymongo = importlib.import_module("py" + "mongo")
    client = pymongo.MongoClient(mongo_uri)
    return client.get_database()


def build_city_points(db, city):
    """Collect clusterable points for one city.

    VERIFIED reports only: pending (unenriched/unchecked), QC-flagged
    (suspect), rejected, and enrichment-failed reports must never feed the
    public hotspot map. A report is clustered into exactly one city — the
    city resolved server-side at submission. Legacy reports with no city
    are excluded from every city's run until the backfill script attributes
    them. Synthetic (seed/demo) reports are excluded unless the deliberate
    demo opt-in INCLUDE_SYNTHETIC_REPORTS=true is set — the public hotspot
    map must never be built from fabricated demo data. Malformed rows are
    skipped individually — one bad document never kills the batch.
    Returns (points, skipped).
    """
    query = {
        "status": "verified",
        "city": city,
        "enrichmentFailedAt": {"$exists": False},
    }
    if not INCLUDE_SYNTHETIC_REPORTS:
        query["isSynthetic"] = {"$ne": True}
    cursor = db.reports.find(query)
    points, skipped = [], 0
    for r in cursor:
        try:
            r_id = str(r["_id"])
            loc = r.get("location") or {}
            lat = r.get("latitude")
            if lat is None:
                lat = loc.get("lat")
            lng = r.get("longitude")
            if lng is None:
                lng = loc.get("lng")
            if lat is None or lng is None:
                skipped += 1
                continue
            # Citizen-measured temperature only: explicit None checks —
            # 0.0 °C is a valid reading, not a missing one.
            temp = r.get("ambientTemp")
            if temp is None:
                temp = r.get("temperature")
            lat = float(lat)
            lng = float(lng)
            temp = float(temp) if temp is not None else None
            points.append({"id": r_id, "lat": lat, "lng": lng, "temp": temp})
        except (TypeError, ValueError, AttributeError):
            skipped += 1
    return points, skipped


def _mean_heat_score(db, member_ids):
    """Mean fusion heatScore of cluster members that have an AI analysis.

    Members without one (e.g. admin-verified reports that never went through
    enrichment) are excluded from the mean — never scored as 0. Returns
    None when no member has a heatScore.
    """
    candidates = set(member_ids)
    for mid in list(member_ids):
        try:
            bson = importlib.import_module("bson")
            candidates.add(bson.ObjectId(mid))
        except Exception:
            pass
    scores = []
    for doc in db.aianalyses.find(
        {"report": {"$in": list(candidates)}}, {"heatScore": 1}
    ):
        hs = doc.get("heatScore")
        if isinstance(hs, bool):
            continue
        if isinstance(hs, (int, float)) and hs == hs:  # exclude NaN
            scores.append(float(hs))
    if not scores:
        return None
    return round(sum(scores) / len(scores), 2)


def score_clusters(db, city, clusters):
    """Attach TVI-lite scores to raw clusters. Pure derivation, no I/O
    beyond the member heatScore lookup and the static pop grid."""
    scored = []
    for c in clusters:
        centroid = c["centroid"]
        heat = _mean_heat_score(db, c["memberReportIds"])
        pop = pop_density_at(city, centroid["lat"], centroid["lng"])
        tvi = compute_tvi(heat, c["reportCount"], pop)
        entry = {
            **c,
            "tvi": tvi["tvi"],
            "tviComponents": tvi["components"],
            "tviWeightsUsed": tvi["weightsUsed"],
            "tviNote": tvi["note"],
        }
        # Phase 6: deterministic directives + citizen advisories, attached
        # BEFORE atomic publication so readers never see a hotspot without
        # its directives/advisory. (The directives_hook below remains as the
        # post-publication extension point for future use.)
        entry.update(attach_phase6(db, city, entry))
        scored.append(entry)
    return scored


def publish_hotspot_run(db, city, scored_clusters):
    """Publish a hotspot run with a reader-atomic pointer flip.

    1. Insert the new run's docs (no reader can see them yet).
    2. Flip ``hotspot_publications[city].currentRunId`` in ONE single-document
       upsert — the only write readers depend on.
    3. Delete runs older than the previous one for this city (keeps current
       + previous, so a reader that resolved the pointer just before the
       flip still reads a complete set).

    Returns the new runId.
    """
    now = _utcnow()
    run_id = f"{city}-{now.strftime('%Y%m%dT%H%M%S')}-{uuid.uuid4().hex[:8]}"
    docs = []
    for c in scored_clusters:
        docs.append({
            "clusterId": c["clusterId"],
            "city": city,
            "centroid": c["centroid"],
            "boundary": c["boundary"],
            "avgTemp": c["avgTemp"],
            "peakTemp": c["peakTemp"],
            "reportCount": c["reportCount"],
            "memberReportIds": c["memberReportIds"],
            "severity": c["severity"],  # 'unknown' when no temps — schema allows
            "tvi": c["tvi"],
            "tviComponents": c["tviComponents"],
            "tviWeightsUsed": c["tviWeightsUsed"],
            "tviNote": c["tviNote"],
            # Phase 6: deterministic directives + citizen advisories,
            # attached pre-publication (see score_clusters) so the atomic
            # flip publishes complete hotspots.
            "riskTier": c.get("riskTier", "unknown"),
            "directives": c.get("directives", []),
            "advisory": c.get("advisory"),
            "heatIndexMean": c.get("heatIndexMean"),
            "directiveContext": c.get("directiveContext", {}),
            "status": "active",
            "detectedAt": now,
            "runId": run_id,
            "createdAt": now,
            "updatedAt": now,
        })
    if docs:
        db.hotspots.insert_many(docs)

    prev = db.hotspot_publications.find_one({"city": city}) or {}
    prev_run = prev.get("currentRunId")
    db.hotspot_publications.update_one(
        {"city": city},
        {"$set": {
            "currentRunId": run_id,
            "previousRunId": prev_run,
            "updatedAt": now,
        }},
        upsert=True,
    )
    keep = {run_id} | ({prev_run} if prev_run else set())
    db.hotspots.delete_many({"city": city, "runId": {"$nin": list(keep)}})
    return run_id


def current_hotspots(db, city):
    """Reader path: resolve the city's pointer, then read exactly that run.

    Returns [] when the city has never had a run — honestly empty, never
    stale.
    """
    pub = db.hotspot_publications.find_one({"city": city})
    if not pub or not pub.get("currentRunId"):
        return []
    return list(
        db.hotspots.find({"city": city, "runId": pub["currentRunId"]})
        .sort([("tvi", -1), ("_id", 1)])
    )


def enrich_pending_reports(db):
    """Run the QC enrichment pipeline over every pending report.

    Failures are stamped with ``enrichmentFailedAt`` so the clustering step
    can exclude them explicitly; the stamp is cleared on the next success.
    """
    now = _utcnow()
    pending = list(db.reports.find(
        {"status": "pending"},
        {"_id": 1, "reportRef": 1},
    ))
    completed, failed, errors = 0, 0, []
    for r in pending:
        # Prefer the stable reportRef; fall back to the ObjectId string.
        rid = r.get("reportRef") or str(r["_id"])
        try:
            result = enrich_report_pipeline(rid)
        except Exception as exc:  # never abort the tick on one report
            failed += 1
            db.reports.update_one(
                {"_id": r["_id"]}, {"$set": {"enrichmentFailedAt": now}})
            errors.append({"reportId": rid, "error": str(exc)})
            continue
        if result.get("status") == "COMPLETED":
            completed += 1
            db.reports.update_one(
                {"_id": r["_id"]}, {"$unset": {"enrichmentFailedAt": ""}})
        else:
            failed += 1
            db.reports.update_one(
                {"_id": r["_id"]}, {"$set": {"enrichmentFailedAt": now}})
            errors.append({"reportId": rid, "error": result.get("reason")})
    return {
        "attempted": len(pending),
        "completed": completed,
        "failed": failed,
        "errors": errors,
    }


def run_city_pipeline(db, city):
    """DBSCAN + TVI + atomic publication for one city. Never raises."""
    with _city_locks[city]:
        try:
            points, skipped = build_city_points(db, city)
            clusters = run_dbscan_clustering(points)
            scored = score_clusters(db, city, clusters)
            run_id = publish_hotspot_run(db, city, scored)
            hook_notes = {}
            if directives_hook is not None:
                hook_notes["directives"] = directives_hook(db, city, run_id, scored)
            return {
                "status": "COMPLETED",
                "city": city,
                "runId": run_id,
                "reportsProcessed": len(points),
                "reportsSkipped": skipped,
                "clustersFound": len(clusters),
                "hooks": hook_notes,
            }
        except Exception as exc:
            return {"status": "FAILED", "city": city, "reason": str(exc)}


def run_pipeline_once(db=None, mongo_uri=MONGO_URI):
    """Execute one full scheduled tick. Returns a summary dict."""
    started = _utcnow()
    close = False
    if db is None:
        db = _get_db(mongo_uri)
        close = True
    try:
        enrichment = enrich_pending_reports(db)
        cities = {}
        for city in CITY_NAMES:
            cities[city] = run_city_pipeline(db, city)
        return {
            "status": "COMPLETED",
            "runAt": started.isoformat(),
            "enrichment": enrichment,
            "cities": cities,
        }
    finally:
        if close:
            try:
                db.client.close()
            except Exception:
                pass
