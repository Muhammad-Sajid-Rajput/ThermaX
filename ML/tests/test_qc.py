"""Phase 3 QC tests.

Part 1 — unit tests for each of the four checks: tolerance boundaries,
missing-signal neutrality, and the deletion of the old ``severity * 8``
proxy (which laundered a 1–5 severity into a fake temperature).

Part 2 — a seeded, deterministic evaluation: 20 honest reports and 10
spoofed reports are run through QC and scored as a binary classifier
(positive class = "suspect"). Target: precision ≥ 0.8.

Part 3 — enrichment idempotency: running the pipeline twice must leave
exactly one satellite-analysis row and one AI-analysis row per report.
"""
import sys
import types
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import CITY_BOUNDS
from services.quality_control import (
    run_quality_checks,
    TEMP_TOLERANCE_C,
    ANOMALY_TOLERANCE_C,
    EXPECTED_ANOMALY_BY_SEVERITY,
)


def _report(**overrides):
    base = {
        "latitude": 24.86,
        "longitude": 67.0,
        "severityLevel": 3,
        "ambientTemp": 40.0,
        "city": "Karachi",
        "images": ["photo.jpg"],
    }
    base.update(overrides)
    return base


def _weather(**overrides):
    base = {"temperature": 39.5, "heatIndex": 41.0}
    base.update(overrides)
    return base


def _sat(lst=48.0, **overrides):
    base = {
        "status": "ok",
        "isSynthetic": False,
        "lst": lst,
        "observedAt": "2026-09-23",
        "source": "MODIS Terra LST (Google Earth Engine)",
    }
    base.update(overrides)
    return base


def _check_result(qc, name):
    return next(c for c in qc["checks"] if c["name"] == name)


# ─── Part 1: unit tests ─────────────────────────────────────────────────────


def test_honest_report_passes_all_checks():
    qc = run_quality_checks(_report(), _weather(), _sat(lst=48.0))
    # temp: |40.0 − 39.5| ≤ 3 ✓
    # anomaly: 48.0 − 39.5 = 8.5 vs expected 8.0 ± 8 ✓
    assert qc["verdict"] == "pass"
    assert qc["score"] == 1.0
    assert {c["name"] for c in qc["checks"]} == {
        "citizen_temp_vs_weather",
        "severity_vs_surface_air_excess",
        "gps_plausibility",
        "photo_presence",
    }


def test_temperature_tolerance_boundary():
    # Exactly at tolerance → pass; a hair beyond → fail.
    passing = run_quality_checks(
        _report(ambientTemp=39.5 + TEMP_TOLERANCE_C), _weather(temperature=39.5), _sat()
    )
    assert _check_result(passing, "citizen_temp_vs_weather")["result"] == "pass"

    failing = run_quality_checks(
        _report(ambientTemp=39.5 + TEMP_TOLERANCE_C + 0.1), _weather(temperature=39.5), _sat()
    )
    assert _check_result(failing, "citizen_temp_vs_weather")["result"] == "fail"
    assert failing["verdict"] == "suspect"


def test_spoofed_temperature_fails():
    qc = run_quality_checks(_report(ambientTemp=25.0), _weather(temperature=40.0), _sat())
    assert _check_result(qc, "citizen_temp_vs_weather")["result"] == "fail"
    assert qc["verdict"] == "suspect"


def test_severity_is_judged_against_anomaly_not_absolute_lst():
    # Severity 5 with modest absolute LST but a strong surface-air excess:
    # anomaly = 45 − 29 = 16, expected for band 5 is 16 → pass. Under the
    # old "severity × 8 vs absolute LST" logic this would look absurd.
    qc = run_quality_checks(
        _report(severityLevel=5, ambientTemp=29.5),
        _weather(temperature=29.0),
        _sat(lst=45.0),
    )
    assert _check_result(qc, "severity_vs_surface_air_excess")["result"] == "pass"


def test_severity_spoofed_against_anomaly_fails():
    # Severity 5 claimed, but the surface is barely warmer than the air:
    # anomaly = 31 − 29 = 2 vs expected 16 ± 8 → fail.
    qc = run_quality_checks(
        _report(severityLevel=5, ambientTemp=29.5),
        _weather(temperature=29.0),
        _sat(lst=31.0),
    )
    assert _check_result(qc, "severity_vs_surface_air_excess")["result"] == "fail"
    assert qc["verdict"] == "suspect"


def test_missing_signals_are_skipped_not_invented():
    qc = run_quality_checks(_report(), None, None)
    by_name = {c["name"]: c["result"] for c in qc["checks"]}
    assert by_name["citizen_temp_vs_weather"] == "skipped"
    assert by_name["severity_vs_surface_air_excess"] == "skipped"
    assert by_name["gps_plausibility"] == "pass"
    # Skipped checks stay neutral (nothing invented), BUT the independent
    # environmental-evidence policy applies: with no environmental signal
    # at all, GPS plausibility alone cannot verify — the report is
    # "suspect" and goes to human moderation.
    assert qc["verdict"] == "suspect"
    assert by_name["environmental_evidence"] == "fail"


def test_zero_celsius_is_a_measurement_not_missing():
    # 0.0 must not fall through to a default via falsy/None confusion.
    qc = run_quality_checks(
        _report(ambientTemp=0.0), _weather(temperature=0.5), _sat(lst=8.0)
    )
    temp_check = _check_result(qc, "citizen_temp_vs_weather")
    assert temp_check["result"] == "pass"


def test_gps_null_island_and_out_of_city_fail():
    assert _check_result(
        run_quality_checks(_report(latitude=0.0, longitude=0.0), _weather(), _sat()),
        "gps_plausibility",
    )["result"] == "fail"

    nyc = run_quality_checks(
        _report(latitude=40.7, longitude=-74.0), _weather(), _sat()
    )
    assert _check_result(nyc, "gps_plausibility")["result"] == "fail"
    assert nyc["verdict"] == "suspect"


def test_photo_presence_is_soft():
    qc = run_quality_checks(_report(images=[]), _weather(), _sat())
    photo = _check_result(qc, "photo_presence")
    assert photo["result"] == "warning"
    # No photo alone never flips the verdict.
    assert qc["verdict"] == "pass"


def test_score_degrades_per_hard_failure():
    qc = run_quality_checks(
        _report(latitude=0.0, longitude=0.0, ambientTemp=25.0),
        _weather(temperature=40.0),
        _sat(),
    )
    assert qc["verdict"] == "suspect"
    assert qc["score"] == round(1.0 - 0.35 * 2, 2)


def test_no_severity_times_eight_proxy():
    # The old formula turned severity into a fake "temperature" and compared
    # it against real thermometers. Prove no such computation exists (the
    # docstring is allowed to *mention* it — it documents the deletion).
    import inspect
    import re
    import services.quality_control as qc_module

    source = inspect.getsource(qc_module)
    code = re.sub(r'"""[\s\S]*?"""', "", source)  # strip docstrings
    code = re.sub(r"'''[\s\S]*?'''", "", code)
    code = re.sub(r"#.*", "", code)  # strip comments
    assert not re.search(r"severity\s*\*\s*8", code), "severity×8 proxy is back"


# ─── Part 2: seeded evaluation (20 honest + 10 spoofed) ──────────────────────


def _honest_reports():
    """Deterministic honest reports: internally consistent signals."""
    cities = ["Karachi", "Lahore", "Islamabad"]
    reports = []
    for i in range(20):
        city = cities[i % 3]
        (lat_lo, lat_hi), (lng_lo, lng_hi) = (
            CITY_BOUNDS[city]["lat"],
            CITY_BOUNDS[city]["lng"],
        )
        severity = 2 + (i % 4)  # 2..5
        weather_temp = 36.0 + (i % 6)  # 36..41
        citizen_temp = weather_temp + ((i % 3) - 1) * 1.2  # within ±3
        anomaly = EXPECTED_ANOMALY_BY_SEVERITY[severity] + ((i % 3) - 1) * 2.0
        reports.append(
            (
                _report(
                    latitude=round((lat_lo + lat_hi) / 2 + (i % 5) * 0.01, 4),
                    longitude=round((lng_lo + lng_hi) / 2 + (i % 7) * 0.01, 4),
                    severityLevel=severity,
                    ambientTemp=round(citizen_temp, 1),
                    city=city,
                    images=["photo.jpg"] if i % 2 == 0 else [],
                ),
                _weather(temperature=weather_temp),
                _sat(lst=round(weather_temp + anomaly, 1)),
            )
        )
    return reports


def _spoofed_reports():
    """Deterministic spoofed reports: each breaks at least one hard check."""
    return [
        # 1: fabricated cold reading on a scorching day.
        (_report(ambientTemp=25.0), _weather(temperature=40.0), _sat(lst=45.0)),
        # 2: exaggerated heat reading.
        (_report(ambientTemp=48.0), _weather(temperature=38.0), _sat(lst=50.0)),
        # 3: severity 5 with no surface-air excess (winter-like surface).
        (_report(severityLevel=5, ambientTemp=29.5), _weather(temperature=29.0), _sat(lst=31.0)),
        # 4: severity 1 with extreme surface-air excess.
        (_report(severityLevel=1, ambientTemp=41.0), _weather(temperature=40.0), _sat(lst=58.0)),
        # 5: null-island coordinates.
        (_report(latitude=0.0, longitude=0.0), _weather(), _sat()),
        # 6: coordinates on another continent.
        (_report(latitude=40.7, longitude=-74.0), _weather(), _sat()),
        # 7: coordinates at sea, outside every city box.
        (_report(latitude=24.0, longitude=64.0), _weather(), _sat()),
        # 8: both temperature and anomaly fabricated.
        (_report(severityLevel=5, ambientTemp=30.0), _weather(temperature=42.0), _sat(lst=35.0)),
        # 9: severity 3 with a cold surface anomaly.
        (_report(severityLevel=3, ambientTemp=39.0), _weather(temperature=38.0), _sat(lst=25.0)),
        # 10: missing coordinates entirely.
        (_report(latitude=None, longitude=None), _weather(), _sat()),
    ]


def test_seeded_evaluation_precision_recall():
    honest = _honest_reports()
    spoofed = _spoofed_reports()
    assert len(honest) == 20 and len(spoofed) == 10

    tp = sum(
        1 for r, w, s in spoofed if run_quality_checks(r, w, s)["verdict"] == "suspect"
    )
    fn = len(spoofed) - tp
    fp = sum(
        1 for r, w, s in honest if run_quality_checks(r, w, s)["verdict"] == "suspect"
    )
    tn = len(honest) - fp

    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0

    print(
        f"\nQC evaluation — honest: {len(honest)}, spoofed: {len(spoofed)} | "
        f"TP={tp} FP={fp} TN={tn} FN={fn} | "
        f"precision={precision:.2f} recall={recall:.2f}"
    )
    assert precision >= 0.8, f"precision {precision:.2f} below target 0.8"
    assert recall >= 0.8, f"recall {recall:.2f} below target 0.8"


# ─── Part 3: enrichment idempotency ──────────────────────────────────────────


class _FakeObjectId:
    _counter = 0

    def __init__(self, value=None):
        _FakeObjectId._counter += 1
        self.value = value if value is not None else f"oid-{_FakeObjectId._counter}"

    def __str__(self):
        return str(self.value)

    def __repr__(self):
        return f"_FakeObjectId({self.value!r})"

    def __eq__(self, other):
        return isinstance(other, _FakeObjectId) and self.value == other.value

    def __hash__(self):
        return hash(("fake-oid", self.value))


def _install_mongo_stubs(monkeypatch):
    """Stub pymongo/bson so the pipeline runs against mongomock."""
    import mongomock
    import mongomock.collection as _mm_collection

    # mongomock binds the REAL bson BSON class at its own import time and
    # validates every inserted document with it — which rejects our
    # intentional _FakeObjectId. The sys.modules stub below arrives too
    # late to change that binding, so disable mongomock's real-bson
    # validation explicitly. (In envs without pymongo installed this was
    # implicitly None; this makes the stub strategy work in any env.)
    monkeypatch.setattr(_mm_collection, "BSON", None)

    holder = {}

    def _mongo_client(uri):
        if "client" not in holder:
            client = mongomock.MongoClient()
            # get_database() with no name needs a default; mongomock does not
            # take it from the URI, so pin it the way the real URI would.
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

    # Eager client so tests can seed data before the pipeline runs; the
    # pipeline itself gets the same client (same in-memory database).
    holder["get_db"] = lambda: _mongo_client("mongodb://test/thermax").get_database()

    from services.gee_service import gee_service

    def _fake_satellite(lat, lng):
        return {
            "status": "ok",
            "isSynthetic": False,
            "lst": 50.0,
            "ndvi": None,
            "landCover": None,
            "uhiClassification": "Extreme UHI",
            "geeTileId": "MOD11A1_test_tile",
            "observedAt": "2026-09-23",
            "source": "MODIS Terra LST (Google Earth Engine)",
        }

    monkeypatch.setattr(gee_service, "extract_satellite_metrics", _fake_satellite)
    return holder


def _seed_report(db, **overrides):
    report = {
        "_id": _FakeObjectId("report-1"),
        "reportRef": "HTX-QC-1",
        "latitude": 24.86,
        "longitude": 67.0,
        "severityLevel": 4,
        "ambientTemp": 41.0,
        "city": "Karachi",
        "images": ["photo.jpg"],
        "status": "pending",
    }
    report.update(overrides)
    snapshot = {
        "_id": _FakeObjectId("snapshot-1"),
        "report": report["_id"],
        "temperature": 40.0,
        "heatIndex": 42.0,
    }
    report["weatherSnapshotRef"] = snapshot["_id"]
    db.reports.insert_one(report)
    db.weathersnapshots.insert_one(snapshot)
    return report


def test_pipeline_is_idempotent(monkeypatch):
    holder = _install_mongo_stubs(monkeypatch)
    from services.pipeline_runner import enrich_report_pipeline

    db = holder["get_db"]()
    _seed_report(db)

    first = enrich_report_pipeline("HTX-QC-1")
    second = enrich_report_pipeline("HTX-QC-1")

    assert first["status"] == "COMPLETED"
    assert second["status"] == "COMPLETED"
    # Exactly one analysis row per report, no matter how many runs.
    assert db.satelliteanalyses.count_documents({}) == 1
    assert db.aianalyses.count_documents({}) == 1

    sat_row = db.satelliteanalyses.find_one({})
    assert sat_row["observedAt"] is not None  # GEE provenance persisted
    ai_row = db.aianalyses.find_one({})
    assert ai_row["qcVerdict"] == "pass"
    assert len(ai_row["qcChecks"]) == 4

    report = db.reports.find_one({"reportRef": "HTX-QC-1"})
    assert report["status"] == "verified"  # QC pass → lifecycle moves pending → verified
    assert second["reportStatus"] == "unchanged"  # rerun does not touch it


def test_pipeline_flags_spoofed_report(monkeypatch):
    holder = _install_mongo_stubs(monkeypatch)
    from services.pipeline_runner import enrich_report_pipeline

    db = holder["get_db"]()
    _seed_report(db, ambientTemp=25.0)  # spoofed cold reading on a 40°C day

    result = enrich_report_pipeline("HTX-QC-1")
    assert result["status"] == "COMPLETED"
    assert result["qcVerdict"] == "suspect"

    report = db.reports.find_one({"reportRef": "HTX-QC-1"})
    assert report["status"] == "flagged"  # QC suspect → lifecycle moves pending → flagged
    assert db.satelliteanalyses.count_documents({}) == 1


def test_pipeline_refuses_reports_without_coordinates(monkeypatch):
    holder = _install_mongo_stubs(monkeypatch)
    from services.pipeline_runner import enrich_report_pipeline

    db = holder["get_db"]()
    report = {
        "_id": _FakeObjectId("report-nocoords"),
        "reportRef": "HTX-QC-NOCOORDS",
        "latitude": None,
        "longitude": None,
        "severityLevel": 3,
        "status": "pending",
    }
    db.reports.insert_one(report)

    result = enrich_report_pipeline("HTX-QC-NOCOORDS")
    assert result["status"] == "FAILED"
    assert "coordinates" in result["reason"]
    assert db.satelliteanalyses.count_documents({}) == 0


def test_gps_alone_cannot_verify_when_weather_and_satellite_unavailable():
    """Independent environmental-evidence policy: a report whose GPS check
    passes but whose weather AND satellite signals are both unavailable
    must be 'suspect' (flagged for human review) — never auto-verified."""
    qc = run_quality_checks(_report(), None, None)
    assert _check_result(qc, "gps_plausibility")["result"] == "pass"
    assert _check_result(qc, "citizen_temp_vs_weather")["result"] == "skipped"
    assert _check_result(qc, "severity_vs_surface_air_excess")["result"] == "skipped"
    ev = _check_result(qc, "environmental_evidence")
    assert ev["result"] == "fail"
    assert "GPS plausibility alone cannot verify" in ev["detail"]
    assert qc["verdict"] == "suspect"
    assert qc["score"] <= 0.5


def test_environmental_evidence_check_absent_when_a_signal_ran():
    """When at least one environmental check actually runs, no fifth check
    is appended and the normal verdict logic applies."""
    # Only weather available (satellite unavailable): check 1 runs.
    qc = run_quality_checks(_report(), _weather(), None)
    assert {c["name"] for c in qc["checks"]} == {
        "citizen_temp_vs_weather",
        "severity_vs_surface_air_excess",
        "gps_plausibility",
        "photo_presence",
    }
    assert qc["verdict"] == "pass"

    # Only satellite available (no weather snapshot): check 2 is skipped
    # (it needs the air temp), check 1 is skipped — so the policy fires.
    qc2 = run_quality_checks(_report(), None, _sat(lst=48.0))
    assert qc2["verdict"] == "suspect"
    assert _check_result(qc2, "environmental_evidence")["result"] == "fail"
