"""Regression tests for the pre-Phase-4 review remediation.

Covers:
- fusion hardening: NaN/±inf signals are treated as unavailable (never
  scored, never persisted as NaN); a truthy qc_result without a "score"
  key no longer KeyErrors; missing/non-finite severity raises instead of
  being invented as 3.
- pipeline honesty: missing severity fails enrichment (no fabrication);
  analysis refs are linked even when the report was already moderated,
  without overwriting the admin decision.
- clustering-task ingestion: flagged/rejected reports are excluded from
  hotspots; a null-location row is skipped without killing the batch;
  a 0.0 °C reading is kept as a measurement.
"""
import math

import pytest

from tests.test_qc import _install_mongo_stubs, _seed_report, _FakeObjectId
from services.fusion_service import calculate_fusion_score


# --- fusion hardening -----------------------------------------------------

def test_fusion_ignores_nan_heat_index():
    result = calculate_fusion_score(4, float("nan"), 45.0)
    assert math.isfinite(result["heatScore"])
    assert result["sources"]["weather"] is None  # excluded, not scored
    assert result["sources"]["satellite"] == "MODIS LST (GEE)"


def test_fusion_ignores_inf_satellite_lst():
    result = calculate_fusion_score(4, 41.5, float("inf"))
    assert math.isfinite(result["heatScore"])
    assert result["sources"]["satellite"] is None


def test_fusion_qc_result_without_score_key_does_not_keyerror():
    # A truthy dict missing "score" used to raise KeyError.
    result = calculate_fusion_score(4, 41.5, 33.0, qc_result={})
    assert result["qualityControlScore"] is None


def test_fusion_qc_result_none_means_not_assessed():
    result = calculate_fusion_score(4, 41.5, 33.0, qc_result=None)
    assert result["qualityControlScore"] is None


def test_fusion_qc_result_with_score_is_reported():
    result = calculate_fusion_score(4, 41.5, 33.0, qc_result={"score": 82.5})
    assert result["qualityControlScore"] == 82.5


def test_fusion_missing_severity_raises_instead_of_inventing():
    with pytest.raises(ValueError):
        calculate_fusion_score(None, 41.5, 33.0)


def test_fusion_nan_severity_raises():
    with pytest.raises(ValueError):
        calculate_fusion_score(float("nan"), 41.5, 33.0)


# --- pipeline honesty -----------------------------------------------------

def test_pipeline_links_refs_without_overwriting_moderation(monkeypatch):
    holder = _install_mongo_stubs(monkeypatch)
    from services.pipeline_runner import enrich_report_pipeline

    db = holder["get_db"]()
    # Admin verified the report BEFORE enrichment ran.
    _seed_report(db, status="verified")

    result = enrich_report_pipeline("HTX-QC-1")
    assert result["status"] == "COMPLETED"

    report = db.reports.find_one({"reportRef": "HTX-QC-1"})
    assert report["status"] == "verified"  # admin decision stands
    assert report["satelliteAnalysisRef"] is not None  # ...but refs are linked
    assert report["aiAnalysisRef"] is not None


def test_pipeline_refuses_missing_severity(monkeypatch):
    holder = _install_mongo_stubs(monkeypatch)
    from services.pipeline_runner import enrich_report_pipeline

    db = holder["get_db"]()
    _seed_report(db, severityLevel=None)  # "severity" key absent in seed

    result = enrich_report_pipeline("HTX-QC-1")
    assert result["status"] == "FAILED"
    assert "severity" in result["reason"].lower()

    # Nothing persisted, report untouched.
    assert db.satelliteanalyses.count_documents({}) == 0
    assert db.aianalyses.count_documents({}) == 0
    report = db.reports.find_one({"reportRef": "HTX-QC-1"})
    assert report["status"] == "pending"


# --- clustering-task ingestion --------------------------------------------

def test_clustering_task_excludes_suspect_reports_and_survives_bad_rows(monkeypatch):
    holder = _install_mongo_stubs(monkeypatch)
    import tasks

    db = holder["get_db"]()

    # Three verified reports within DBSCAN eps -> one cluster.
    for i in range(3):
        db.reports.insert_one({
            "_id": _FakeObjectId(f"v-{i}"),
            "city": "Karachi",
            "status": "verified",
            "latitude": 24.8600 + i * 0.001,
            "longitude": 67.0100,
            "ambientTemp": 42.0,
        })
    # QC-flagged and admin-rejected reports must never feed the hotspot map.
    db.reports.insert_one({
        "_id": _FakeObjectId("f-1"), "city": "Karachi", "status": "flagged",
        "latitude": 24.8601, "longitude": 67.0101, "ambientTemp": 99.0,
    })
    db.reports.insert_one({
        "_id": _FakeObjectId("r-1"), "city": "Karachi", "status": "rejected",
        "latitude": 24.8602, "longitude": 67.0102, "ambientTemp": 99.0,
    })
    # Phase 5: pending reports never cluster either (verified-only). The
    # null-location pending row is excluded by status, not by the skip path.
    db.reports.insert_one({
        "_id": _FakeObjectId("n-1"), "city": "Karachi", "status": "pending",
        "location": None, "ambientTemp": 40.0,
    })
    # 0.0 °C is a measurement, not a missing value — on a VERIFIED report
    # so the verified-only filter doesn't mask the check.
    db.reports.insert_one({
        "_id": _FakeObjectId("z-1"), "city": "Karachi", "status": "verified",
        "latitude": 24.8603, "longitude": 67.0103, "ambientTemp": 0.0,
    })
    # Explicit-null location on a verified report: skipped, must not crash.
    db.reports.insert_one({
        "_id": _FakeObjectId("m-1"), "city": "Karachi", "status": "verified",
        "location": None, "ambientTemp": 40.0,
    })

    result = tasks.run_clustering_task("Karachi")

    assert result["status"] == "COMPLETED"
    assert result["reportsProcessed"] == 4  # 3 verified + 1 verified (0.0 °C)
    assert result["reportsSkipped"] == 1  # the null-location verified row
    assert result["clustersFound"] == 1

    hotspots = list(db.hotspots.find({}))
    assert len(hotspots) == 1
    hotspot = hotspots[0]
    assert len(hotspot["memberReportIds"]) == 4
    # The 0.0 °C reading is inside the average (42+42+42+0)/4 = 31.5;
    # dropping it as falsy would have given 42.0.
    assert hotspot["avgTemp"] == 31.5
    # The 99.0 °C suspect readings were excluded from the cluster.
    assert hotspot["peakTemp"] == 42.0
