"""Phase 5 tests: per-city verified-only clustering, TVI-lite scoring,
reader-atomic publication via the city current-run pointer.

Test proof from the plan:
- Seed data in 2 cities → pipeline produces separate hotspot sets; a
  Karachi report never joins a Lahore cluster.
- Pending/flagged/enrichment-failed reports never cluster (verified-only).
- Hotspots persist TVI + the three components, wired to real inputs.
- Ranking order on a fixed seed set is deterministic across runs.
- Crash between insert and pointer-flip → readers still see the old
  complete run; the next tick retires the orphaned docs.
"""
import pytest

from tests.test_qc import _install_mongo_stubs, _FakeObjectId
from tests.test_phase4 import (
    _seed_verified,
    _seed_pending_passing_qc,
    KARACHI_CENTERS,
    LAHORE_CENTERS,
)
import services.scheduled_pipeline as sp
from services.scheduled_pipeline import (
    build_city_points,
    current_hotspots,
    publish_hotspot_run,
    run_city_pipeline,
    run_pipeline_once,
    score_clusters,
)
from services.tvi_service import compute_tvi


def _seed_heat(db, prefix, ci, i, score):
    db.aianalyses.insert_one({
        "report": _FakeObjectId(f"{prefix}-{ci}-{i}"),
        "heatScore": score,
    })


def _seed_heat_all(db, prefix, centers, per_center=5, score=80.0):
    for ci in range(len(centers)):
        for i in range(per_center):
            _seed_heat(db, prefix, ci, i, score)


ISLAMABAD_CENTERS = [(33.690, 73.060)]


# ── verified-only clustering ─────────────────────────────────────────────

def test_pending_flagged_and_failed_reports_never_cluster(monkeypatch):
    holder = _install_mongo_stubs(monkeypatch)
    db = holder["get_db"]()
    _seed_verified(db, "k", "Karachi", [KARACHI_CENTERS[0]])  # 5 verified
    # 5 pending + 1 flagged + 1 enrichment-failed, all inside the same
    # tight cluster — none may join it.
    for i in range(5):
        db.reports.insert_one({
            "_id": _FakeObjectId(f"pend-{i}"),
            "city": "Karachi", "status": "pending",
            "latitude": 24.860 + i * 0.001, "longitude": 67.010 + i * 0.001,
            "ambientTemp": 42.0,
        })
    db.reports.insert_one({
        "_id": _FakeObjectId("flag-0"),
        "city": "Karachi", "status": "flagged",
        "latitude": 24.861, "longitude": 67.011, "ambientTemp": 42.0,
    })
    db.reports.insert_one({
        "_id": _FakeObjectId("fail-0"),
        "city": "Karachi", "status": "verified",  # admin-verified…
        "enrichmentFailedAt": "2026-09-27T00:00:00Z",  # …but enrichment failed
        "latitude": 24.862, "longitude": 67.012, "ambientTemp": 42.0,
    })

    points, skipped = build_city_points(db, "Karachi")
    assert len(points) == 5
    assert all(p["id"].startswith("k-") for p in points)

    res = run_city_pipeline(db, "Karachi")
    assert res["status"] == "COMPLETED"
    assert res["clustersFound"] == 1
    hotspots = current_hotspots(db, "Karachi")
    assert len(hotspots) == 1
    assert hotspots[0]["reportCount"] == 5
    assert all(m.startswith("k-") for m in hotspots[0]["memberReportIds"])


# ── per-city isolation ─────────────────────────────────────────────────────

def test_two_cities_produce_separate_hotspot_sets(monkeypatch):
    holder = _install_mongo_stubs(monkeypatch)
    db = holder["get_db"]()
    _seed_verified(db, "k", "Karachi", KARACHI_CENTERS)
    _seed_verified(db, "l", "Lahore", LAHORE_CENTERS)
    _seed_verified(db, "i", "Islamabad", ISLAMABAD_CENTERS)

    result = run_pipeline_once(db=db)
    assert result["status"] == "COMPLETED"
    assert result["cities"]["Karachi"]["clustersFound"] == 3
    assert result["cities"]["Lahore"]["clustersFound"] == 3
    assert result["cities"]["Islamabad"]["clustersFound"] == 1

    khi = current_hotspots(db, "Karachi")
    lhr = current_hotspots(db, "Lahore")
    isb = current_hotspots(db, "Islamabad")
    assert len(khi) == 3 and len(lhr) == 3 and len(isb) == 1
    # A Karachi report never joins a Lahore cluster (and vice versa).
    assert all(m.startswith("k-") for h in khi for m in h["memberReportIds"])
    assert all(m.startswith("l-") for h in lhr for m in h["memberReportIds"])
    assert all(m.startswith("i-") for h in isb for m in h["memberReportIds"])
    assert {h["city"] for h in khi} == {"Karachi"}


# ── TVI wiring ─────────────────────────────────────────────────────────────

def test_hotspot_tvi_matches_hand_computation(monkeypatch):
    holder = _install_mongo_stubs(monkeypatch)
    db = holder["get_db"]()
    _seed_verified(db, "k", "Karachi", [KARACHI_CENTERS[0]], temp=42.0)
    _seed_heat_all(db, "k", [KARACHI_CENTERS[0]], score=80.0)

    monkeypatch.setattr("services.scheduled_pipeline.pop_density_at", lambda c, lat, lng: 25000.0)
    res = run_city_pipeline(db, "Karachi")
    assert res["clustersFound"] == 1
    (hotspot,) = current_hotspots(db, "Karachi")

    assert hotspot["tvi"] is not None
    comps = hotspot["tviComponents"]
    assert comps["heat"] == pytest.approx(0.8)      # mean heatScore 80 / 100
    assert comps["reports"] == pytest.approx(0.25)  # 5 reports / cap 20
    assert 0.0 < comps["population"] <= 1.0        # pop density component
    # The persisted score equals a fresh hand computation from the same
    # three inputs — the pipeline wires the components, not magic numbers.
    expected = compute_tvi(80.0, 5, comps["population"] * 50000.0)
    assert hotspot["tvi"] == pytest.approx(expected["tvi"])
    assert hotspot["tviWeightsUsed"] == {"heat": 0.5, "reports": 0.3, "population": 0.2}


def test_hotspot_without_heat_data_excludes_component(monkeypatch):
    holder = _install_mongo_stubs(monkeypatch)
    db = holder["get_db"]()
    # Verified reports but NO aianalyses rows → heat component missing.
    _seed_verified(db, "k", "Karachi", [KARACHI_CENTERS[0]])
    monkeypatch.setattr("services.scheduled_pipeline.pop_density_at", lambda c, lat, lng: 25000.0)
    res = run_city_pipeline(db, "Karachi")
    assert res["clustersFound"] == 1
    (hotspot,) = current_hotspots(db, "Karachi")
    assert hotspot["tviComponents"]["heat"] is None
    assert hotspot["tvi"] is not None  # other two components still score
    assert set(hotspot["tviWeightsUsed"]) == {"reports", "population"}
    assert "renormalized" in (hotspot["tviNote"] or "")


# ── deterministic ranking ──────────────────────────────────────────────────

def test_ranking_deterministic_across_runs(monkeypatch):
    holder = _install_mongo_stubs(monkeypatch)
    db = holder["get_db"]()
    _seed_verified(db, "a", "Karachi", [(24.860, 67.010)], temp=44.0)
    _seed_verified(db, "b", "Karachi", [(24.950, 67.100)], temp=38.0)
    _seed_heat_all(db, "a", [(24.860, 67.010)], score=90.0)
    _seed_heat_all(db, "b", [(24.950, 67.100)], score=40.0)

    run_city_pipeline(db, "Karachi")
    first = [(h["clusterId"], h["tvi"]) for h in current_hotspots(db, "Karachi")]
    run_city_pipeline(db, "Karachi")
    second = [(h["clusterId"], h["tvi"]) for h in current_hotspots(db, "Karachi")]

    assert len(first) == 2
    assert first == second, "ranking must be deterministic across runs"
    assert first[0][1] > first[1][1], "hotter cluster ranks first"
    assert all(t == t for _, t in first), "no NaN scores"


# ── reader-atomic publication ──────────────────────────────────────────────

def test_two_ticks_flip_pointer_keep_previous(monkeypatch):
    holder = _install_mongo_stubs(monkeypatch)
    db = holder["get_db"]()
    _seed_verified(db, "k", "Karachi", KARACHI_CENTERS)
    _seed_pending_passing_qc(db, "HTX-P-1", "Karachi", 24.861, 67.011)

    first = run_pipeline_once(db=db)
    assert first["status"] == "COMPLETED"
    pub1 = db.hotspot_publications.find_one({"city": "Karachi"})
    run_a = pub1["currentRunId"]
    assert len(current_hotspots(db, "Karachi")) == 3

    second = run_pipeline_once(db=db)
    pub2 = db.hotspot_publications.find_one({"city": "Karachi"})
    run_b = pub2["currentRunId"]
    assert run_b != run_a, "pointer flipped to the new run"
    assert pub2["previousRunId"] == run_a
    # Readers see exactly the new complete run…
    seen = current_hotspots(db, "Karachi")
    assert len(seen) == 3
    assert {h["runId"] for h in seen} == {run_b}
    # …while the previous run is retained (protects slow readers)…
    assert db.hotspots.count_documents({"runId": run_a}) == 3
    # …and the pointer flip was a single-document upsert, not a flag sweep.
    assert db.hotspot_publications.count_documents({"city": "Karachi"}) == 1

    third = run_pipeline_once(db=db)
    assert third["status"] == "COMPLETED"
    assert db.hotspots.count_documents({"runId": run_a}) == 0, \
        "runs older than previous are retired"
    assert db.hotspots.count_documents({"runId": run_b}) == 3


def test_crash_between_insert_and_flip_readers_unaffected(monkeypatch):
    holder = _install_mongo_stubs(monkeypatch)
    db = holder["get_db"]()
    _seed_verified(db, "k", "Karachi", KARACHI_CENTERS)
    run_city_pipeline(db, "Karachi")
    before = current_hotspots(db, "Karachi")
    assert len(before) == 3
    pub_before = db.hotspot_publications.find_one({"city": "Karachi"})

    # Simulate a kill AFTER the new docs were inserted but BEFORE the
    # pointer flip: orphan docs with a runId no pointer references.
    points, _ = build_city_points(db, "Karachi")
    from services.clustering_service import run_dbscan_clustering
    scored = score_clusters(db, "Karachi", run_dbscan_clustering(points))
    now = sp._utcnow()
    orphan_run = f"Karachi-crashed-{now.strftime('%H%M%S')}"
    db.hotspots.insert_many([{
        "clusterId": "CL-99", "city": "Karachi",
        "centroid": {"lat": 0.0, "lng": 0.0},
        "boundary": {"type": "Polygon", "coordinates": []},
        "reportCount": 1, "memberReportIds": [],
        "severity": "unknown", "tvi": 0.99,
        "tviComponents": {}, "tviWeightsUsed": {}, "tviNote": None,
        "status": "active", "detectedAt": now, "runId": orphan_run,
        "createdAt": now, "updatedAt": now,
    }])

    # Readers still see the old COMPLETE run — the orphan is invisible.
    after = current_hotspots(db, "Karachi")
    assert [h["runId"] for h in after] == [h["runId"] for h in before]
    assert all(h["runId"] != orphan_run for h in after)
    assert db.hotspot_publications.find_one({"city": "Karachi"}) == pub_before

    # The next tick heals: orphan docs are retired, pointer moves on.
    run_city_pipeline(db, "Karachi")
    assert db.hotspots.count_documents({"runId": orphan_run}) == 0
    assert len(current_hotspots(db, "Karachi")) == 3


def test_empty_city_run_is_honestly_empty(monkeypatch):
    holder = _install_mongo_stubs(monkeypatch)
    db = holder["get_db"]()
    res = run_city_pipeline(db, "Islamabad")
    assert res["status"] == "COMPLETED"
    assert res["clustersFound"] == 0
    assert current_hotspots(db, "Islamabad") == []
    # The pointer still flips: readers see "no hotspots", not stale ones.
    pub = db.hotspot_publications.find_one({"city": "Islamabad"})
    assert pub and pub["currentRunId"]


# ── enrichment-failure marker ──────────────────────────────────────────────

def test_enrichment_failed_marker_set_and_cleared(monkeypatch):
    holder = _install_mongo_stubs(monkeypatch)
    db = holder["get_db"]()
    for ref in ("HTX-F-1", "HTX-F-2"):
        db.reports.insert_one({
            "_id": _FakeObjectId(f"oid-{ref}"),
            "reportRef": ref, "city": "Karachi", "status": "pending",
            "latitude": 24.86, "longitude": 67.01,
        })

    calls = {"n": 0}
    def fake_pipeline(rid):
        calls["n"] += 1
        # First report fails, second succeeds — then the first recovers.
        if rid == "HTX-F-1" and calls["n"] <= 2:
            return {"status": "FAILED", "reason": "provider timeout"}
        return {"status": "COMPLETED"}
    monkeypatch.setattr(sp, "enrich_report_pipeline", fake_pipeline)

    out = sp.enrich_pending_reports(db)
    assert out["failed"] == 1 and out["completed"] == 1
    failed_doc = db.reports.find_one({"reportRef": "HTX-F-1"})
    assert failed_doc["enrichmentFailedAt"] is not None
    ok_doc = db.reports.find_one({"reportRef": "HTX-F-2"})
    assert "enrichmentFailedAt" not in ok_doc

    out = sp.enrich_pending_reports(db)
    assert out["failed"] == 0
    recovered = db.reports.find_one({"reportRef": "HTX-F-1"})
    assert "enrichmentFailedAt" not in recovered, "stamp cleared on success"


# ── synthetic-data exclusion ───────────────────────────────────────────────

def test_synthetic_reports_never_cluster(monkeypatch):
    """Seed/demo rows (isSynthetic: true) must not feed the public hotspot
    map — unless the deliberate INCLUDE_SYNTHETIC_REPORTS=true demo opt-in
    is set. Regression test for the no-fabrication policy."""
    holder = _install_mongo_stubs(monkeypatch)
    db = holder["get_db"]()
    _seed_verified(db, "k", "Karachi", [KARACHI_CENTERS[0]])  # 5 real, verified
    # 5 synthetic demo rows in the SAME tight cluster — none may join it.
    for i in range(5):
        db.reports.insert_one({
            "_id": _FakeObjectId(f"syn-{i}"),
            "city": "Karachi", "status": "verified",
            "isSynthetic": True,
            "latitude": 24.860 + i * 0.001, "longitude": 67.010 + i * 0.001,
            "ambientTemp": 42.0, "severityLevel": 4,
        })

    points, _ = build_city_points(db, "Karachi")
    assert len(points) == 5
    assert all(p["id"].startswith("k-") for p in points)

    res = run_city_pipeline(db, "Karachi")
    assert res["status"] == "COMPLETED"
    hotspots = current_hotspots(db, "Karachi")
    assert len(hotspots) == 1
    assert hotspots[0]["reportCount"] == 5
    assert all(m.startswith("k-") for m in hotspots[0]["memberReportIds"])
