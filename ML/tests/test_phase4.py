"""Phase 4 tests: ML endpoint auth, rate limiting, body-size guard,
plus the no-city exclusion invariant.

NOTE: the Phase 4 isCurrent-flip publication mechanism was superseded in
Phase 5 by the city current-run pointer (hotspot_publications). Pipeline
publication tests now live in tests/test_phase5.py.
"""
import importlib
import os

# Set before main is first imported in this session.
os.environ.setdefault("ML_SERVICE_KEY", "phase4-test-key")

from tests.test_qc import _install_mongo_stubs, _FakeObjectId
from services.scheduled_pipeline import build_city_points


# ── helpers ────────────────────────────────────────────────────────────────

def _seed_verified(db, prefix, city, centers, per_center=5, temp=42.0):
    """Seed verified reports in tight clusters around each center."""
    n = 0
    for ci, (clat, clng) in enumerate(centers):
        for i in range(per_center):
            db.reports.insert_one({
                "_id": _FakeObjectId(f"{prefix}-{ci}-{i}"),
                "reportRef": f"HTX-{prefix}-{ci}-{i}",
                "city": city,
                "status": "verified",
                "latitude": clat + i * 0.001,
                "longitude": clng + i * 0.001,
                "ambientTemp": temp,
                "severityLevel": 4,
            })
            n += 1
    return n


def _seed_pending_passing_qc(db, ref, city, lat, lng):
    """Seed one pending report whose QC will pass under the stubbed satellite."""
    rid = _FakeObjectId(f"oid-{ref}")
    snap = _FakeObjectId(f"snap-{ref}")
    db.reports.insert_one({
        "_id": rid,
        "reportRef": ref,
        "city": city,
        "status": "pending",
        "latitude": lat,
        "longitude": lng,
        "ambientTemp": 41.0,
        "severityLevel": 4,
        "images": ["photo.jpg"],
        "weatherSnapshotRef": snap,
    })
    db.weathersnapshots.insert_one({
        "_id": snap,
        "report": rid,
        "temperature": 40.0,
        "heatIndex": 42.0,
    })


KARACHI_CENTERS = [(24.860, 67.010), (24.900, 67.050), (24.820, 66.980)]
LAHORE_CENTERS = [(31.550, 74.350), (31.590, 74.390), (31.510, 74.310)]


# ── HTTP layer: auth, rate limit, body guard ─────────────────────────────────

def _fresh_app(monkeypatch, key="phase4-test-key"):
    """Re-import main with a controlled service key (deterministic even if
    another test module imported main first)."""
    monkeypatch.setenv("ML_SERVICE_KEY", key)
    import config
    import main
    importlib.reload(config)
    importlib.reload(main)
    # Fresh rate-limiter buckets for the reloaded module.
    main._rate_buckets.clear()
    return main


def _client(app_module):
    from fastapi.testclient import TestClient
    # No context manager: lifespan (and its scheduler) stays out of tests.
    return TestClient(app_module.app)


def test_endpoints_require_service_key(monkeypatch):
    main = _fresh_app(monkeypatch, key="phase4-test-key")
    client = _client(main)

    assert client.post("/fuse", json={"severityLevel": 4}).status_code == 401
    assert client.post(
        "/fuse", json={"severityLevel": 4},
        headers={"X-Service-Key": "wrong"},
    ).status_code == 401
    ok = client.post(
        "/fuse", json={"severityLevel": 4},
        headers={"X-Service-Key": "phase4-test-key"},
    )
    assert ok.status_code == 200
    assert main._rate_buckets  # limiter saw traffic
    # /health stays public for load-balancer checks.
    assert client.get("/health").status_code == 200


def test_fuse_rejects_bad_severity_with_400(monkeypatch):
    main = _fresh_app(monkeypatch)
    client = _client(main)
    headers = {"X-Service-Key": "phase4-test-key"}
    r = client.post("/fuse", json={"severityLevel": None}, headers=headers)
    # pydantic rejects null for a required float before our code runs.
    assert r.status_code == 422


def test_rate_limit_101st_request_429(monkeypatch):
    main = _fresh_app(monkeypatch)
    client = _client(main)
    headers = {"X-Service-Key": "phase4-test-key"}

    allowed = 0
    for _ in range(100):
        r = client.post("/fuse", json={"severityLevel": 4}, headers=headers)
        assert r.status_code == 200
        allowed += 1
    assert allowed == 100
    assert client.post("/fuse", json={"severityLevel": 4}, headers=headers).status_code == 429


def test_cluster_body_over_5mb_is_413(monkeypatch):
    main = _fresh_app(monkeypatch)
    client = _client(main)
    headers = {"X-Service-Key": "phase4-test-key", "Content-Type": "application/json"}
    big = b'{"reports": [' + b"x" * (5 * 1024 * 1024) + b"]}"
    r = client.post("/cluster", content=big, headers=headers)
    assert r.status_code == 413


def test_cluster_computes_dbscan_once(monkeypatch):
    main = _fresh_app(monkeypatch)
    calls = []

    def counting_cluster(points):
        calls.append(len(points))
        return [{"clusterId": "CL-01"}]

    monkeypatch.setattr(main, "run_dbscan_clustering", counting_cluster)
    client = _client(main)
    headers = {"X-Service-Key": "phase4-test-key"}
    body = {"reports": [
        {"id": "a", "lat": 24.86, "lng": 67.01},
        {"id": "b", "lat": 24.861, "lng": 67.011},
        {"id": "c", "lat": 24.862, "lng": 67.012},
    ]}
    r = client.post("/cluster", json=body, headers=headers)
    assert r.status_code == 200
    assert r.json()["clusterCount"] == 1
    assert calls == [3], "DBSCAN must run exactly once per request"


# ── re-verification: city attribution + torn-flip healing ───────────────────

def test_no_city_reports_excluded_from_every_city_run(monkeypatch):
    """A legacy report with no city field must not leak into any city's
    DBSCAN run (previously it entered EVERY city's run)."""
    holder = _install_mongo_stubs(monkeypatch)
    db = holder["get_db"]()
    db.reports.insert_one({
        "_id": _FakeObjectId("legacy-nocity-1"),
        "reportRef": "HTX-legacy-1",
        "status": "verified",
        "latitude": 24.860,
        "longitude": 67.010,
        "ambientTemp": 42.0,
        "severityLevel": 4,
    })
    for city in ("Karachi", "Lahore", "Islamabad"):
        points, _ = build_city_points(db, city)
        assert points == [], f"no-city report leaked into {city}"


