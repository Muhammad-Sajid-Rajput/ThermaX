import sys
import types
import pytest
from services.quality_control import run_quality_checks


class _FakeObjectId:
    def __init__(self, val=None):
        self._val = str(val or "507f1f77bcf86cd799439011")

    def __str__(self):
        return self._val

    def __repr__(self):
        return f"ObjectId('{self._val}')"

    def __eq__(self, other):
        return str(self) == str(other)

    def __hash__(self):
        return hash(self._val)


def _install_mongo_stubs(monkeypatch):
    """Stub pymongo/bson so the pipeline runs against mongomock."""
    import mongomock
    import mongomock.collection as _mm_collection

    monkeypatch.setattr(_mm_collection, "BSON", None)

    holder = {}

    def _mongo_client(uri):
        if "client" not in holder:
            client = mongomock.MongoClient()
            _orig = client.get_database
            client.get_database = lambda name=None, **kw: _orig(name or "thermax", **kw)
            holder["client"] = client
        return holder["client"]

    fake_pymongo = types.ModuleType("pymongo")
    fake_pymongo.MongoClient = _mongo_client
    fake_bson = types.ModuleType("bson")
    fake_bson.ObjectId = _FakeObjectId

    monkeypatch.setitem(sys.modules, "pymongo", fake_pymongo)
    monkeypatch.setitem(sys.modules, "bson", fake_bson)

    holder["get_db"] = lambda: _mongo_client("mongodb://test/thermax").get_database()

    from services.gee_service import gee_service

    def _fake_satellite(lat, lng):
        return {
            "status": "ok",
            "isSynthetic": False,
            "lst": 40.0,
            "ndvi": None,
            "landCover": None,
            "uhiClassification": "High UHI",
            "geeTileId": "MOD11A1_test_tile",
            "observedAt": "2026-09-23",
            "source": "MODIS Terra LST (Google Earth Engine)",
        }

    monkeypatch.setattr(gee_service, "extract_satellite_metrics", _fake_satellite)
    return holder


def _seed_report(db, **overrides):
    report = {
        "_id": _FakeObjectId("report-test-notif-1"),
        "reportRef": "HTX-NOTIF-1",
        "latitude": 24.86,
        "longitude": 67.0,
        "severityLevel": 4,
        "ambientTemp": 40.0,
        "city": "Karachi",
        "images": ["photo.jpg"],
        "status": "pending",
    }
    report.update(overrides)
    snapshot = {
        "_id": _FakeObjectId("snapshot-notif-1"),
        "report": report["_id"],
        "temperature": 40.0,
        "heatIndex": 42.0,
    }
    report["weatherSnapshotRef"] = snapshot["_id"]
    db.reports.insert_one(report)
    db.weathersnapshots.insert_one(snapshot)
    return report


def test_extreme_contradiction_creates_one_notification(monkeypatch):
    """Stubbed diff = 20°C (citizen 20°C vs weather 40°C), verdict suspect,
    creates exactly one admin_notifications doc with type extreme_contradiction."""
    holder = _install_mongo_stubs(monkeypatch)
    from services.pipeline_runner import enrich_report_pipeline

    db = holder["get_db"]()
    # citizen ambientTemp = 20.0, weather = 40.0 => diff = 20.0 >= EXTREME_TEMP_DIFF_C (15.0)
    _seed_report(db, ambientTemp=20.0)

    result = enrich_report_pipeline("HTX-NOTIF-1")
    assert result["status"] == "COMPLETED"
    assert result["qcVerdict"] == "suspect"

    notifs = list(db.admin_notifications.find({}))
    assert len(notifs) == 1
    n = notifs[0]
    assert n["type"] == "extreme_contradiction"
    assert n["reportId"] == _FakeObjectId("report-test-notif-1")
    assert "20.0°C" in n["reason"]
    assert n["readAt"] is None
    assert n["readBy"] is None
    assert n["qcScore"] is not None


def test_extreme_contradiction_rerun_idempotent(monkeypatch):
    """Re-running enrichment on the same report does not create duplicate notification."""
    holder = _install_mongo_stubs(monkeypatch)
    from services.pipeline_runner import enrich_report_pipeline

    db = holder["get_db"]()
    _seed_report(db, ambientTemp=20.0)

    first = enrich_report_pipeline("HTX-NOTIF-1")
    second = enrich_report_pipeline("HTX-NOTIF-1")

    assert first["status"] == "COMPLETED"
    assert second["status"] == "COMPLETED"

    # Unique index on (reportId, type) ensures notify-once
    notifs = list(db.admin_notifications.find({"type": "extreme_contradiction"}))
    assert len(notifs) == 1


def test_routine_suspect_creates_no_notification(monkeypatch):
    """Routine suspects (e.g. satellite unavailable, small diff = 5°C > 3°C tolerance but < 15°C)
    quarantined silently without creating notification."""
    holder = _install_mongo_stubs(monkeypatch)
    from services.pipeline_runner import enrich_report_pipeline

    db = holder["get_db"]()
    # citizen ambientTemp = 35.0, weather = 40.0 => diff = 5.0°C (> 3°C fails check, but < 15°C not extreme)
    _seed_report(db, ambientTemp=35.0)

    result = enrich_report_pipeline("HTX-NOTIF-1")
    assert result["status"] == "COMPLETED"
    assert result["qcVerdict"] == "suspect"

    # Routine suspect must not trigger an outlier alert
    assert db.admin_notifications.count_documents({}) == 0


def test_cloudy_satellite_suspect_creates_no_notification(monkeypatch):
    """Cloudy day satellite-unavailable produces suspect verdict but creates NO notification."""
    holder = _install_mongo_stubs(monkeypatch)
    from services.gee_service import gee_service
    from services.pipeline_runner import enrich_report_pipeline

    # Satellite returns unavailable
    monkeypatch.setattr(
        gee_service,
        "extract_satellite_metrics",
        lambda lat, lng: {"status": "unavailable", "lst": None},
    )

    db = holder["get_db"]()
    # Matching temperature: citizen = 40, weather = 40
    _seed_report(db, ambientTemp=40.0)

    result = enrich_report_pipeline("HTX-NOTIF-1")
    assert result["status"] == "COMPLETED"
    # No notification should be generated for cloudy satellite
    assert db.admin_notifications.count_documents({}) == 0


def test_failed_enrichment_creates_notification_and_retry_preserved(monkeypatch):
    """Enrichment failure creates enrichment_failed notification and scheduled tick can retry."""
    holder = _install_mongo_stubs(monkeypatch)
    from services.pipeline_runner import enrich_report_pipeline
    from services.scheduled_pipeline import enrich_pending_reports

    db = holder["get_db"]()
    report = {
        "_id": _FakeObjectId("report-fail-1"),
        "reportRef": "HTX-FAIL-1",
        "latitude": None,
        "longitude": None,
        "severityLevel": 3,
        "status": "pending",
    }
    db.reports.insert_one(report)

    result = enrich_report_pipeline("HTX-FAIL-1")
    assert result["status"] == "FAILED"

    notifs = list(db.admin_notifications.find({"type": "enrichment_failed"}))
    assert len(notifs) == 1
    assert notifs[0]["reportId"] == _FakeObjectId("report-fail-1")
    assert "coordinates" in notifs[0]["reason"]

    # Verify scheduled_pipeline stamps enrichmentFailedAt and report stays pending for retry
    tick_res = enrich_pending_reports(db)
    assert tick_res["failed"] == 1
    stamped = db.reports.find_one({"_id": _FakeObjectId("report-fail-1")})
    assert "enrichmentFailedAt" in stamped
    assert stamped["status"] == "pending"


def test_notification_write_failure_does_not_break_enrichment(monkeypatch):
    """Forced failure in admin_notifications.insert_one must NOT change enrichment outcome."""
    holder = _install_mongo_stubs(monkeypatch)
    from services.pipeline_runner import enrich_report_pipeline

    db = holder["get_db"]()
    _seed_report(db, ambientTemp=20.0)

    def _failing_insert(doc):
        raise RuntimeError("Disk full / Mongo network error")

    monkeypatch.setattr(db.admin_notifications, "insert_one", _failing_insert)

    result = enrich_report_pipeline("HTX-NOTIF-1")
    assert result["status"] == "COMPLETED"
    assert result["qcVerdict"] == "suspect"
    report = db.reports.find_one({"reportRef": "HTX-NOTIF-1"})
    assert report["status"] == "flagged"
