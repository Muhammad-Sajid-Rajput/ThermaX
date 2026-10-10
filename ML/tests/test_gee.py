"""Phase 2 tests for the GEE satellite service.

Data-integrity rule under test: the service never invents LST/NDVI values.
When Earth Engine is unavailable it must return an explicit "unavailable"
payload with null measurements.
"""
import sys
import time
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from services.gee_service import gee_service, UNAVAILABLE, _call_with_timeout, _TIMEOUT, GEEService


def test_unavailable_contract_has_no_measurements():
    assert UNAVAILABLE["status"] == "unavailable"
    assert UNAVAILABLE["lst"] is None
    assert UNAVAILABLE["ndvi"] is None
    assert UNAVAILABLE["isSynthetic"] is False


def test_no_fabricated_lst_when_gee_unavailable():
    if gee_service.gee_available:
        pytest.skip("GEE is configured; the unavailable path is not exercised")
    data = gee_service.extract_satellite_metrics(24.8607, 67.0011)
    assert data["status"] == "unavailable"
    assert data["lst"] is None
    assert data["ndvi"] is None
    assert data["isSynthetic"] is False
    # The old sinusoidal fallback is gone: no empirical-model tile ids.
    assert "EMPIRICAL" not in str(data.get("geeTileId"))


def test_call_with_timeout_enforces_deadline():
    def _slow():
        time.sleep(5)
        return "late"

    start = time.time()
    res = _call_with_timeout(_slow, timeout_s=0.2)
    elapsed = time.time() - start
    assert res is _TIMEOUT
    assert elapsed < 1.0, f"Call took {elapsed}s; deadline was not enforced"


def test_call_with_timeout_returns_value_when_fast():
    def _fast():
        time.sleep(0.05)
        return {"LST_Day_1km": 15000}

    res = _call_with_timeout(_fast, timeout_s=0.5)
    assert res == {"LST_Day_1km": 15000}


def test_classify_uhi_below_41():
    assert GEEService._classify(38.0) == "No significant UHI"
    assert GEEService._classify(40.9) == "No significant UHI"
    assert GEEService._classify(41.0) == "Strong UHI"
    assert GEEService._classify(44.5) == "Extreme UHI"


def test_extract_satellite_metrics_timeout_enforced():
    svc = GEEService()
    svc.gee_available = True

    class StubReducer:
        @staticmethod
        def mean():
            return "mean"

    class StubGeometry:
        @staticmethod
        def Point(coords):
            return coords

    class StubDate:
        def format(self, fmt):
            class StubFmt:
                def getInfo(self):
                    return "2026-06-15"
            return StubFmt()

    class StubRegion:
        def __init__(self, delay=0):
            self.delay = delay

        def getInfo(self):
            if self.delay:
                time.sleep(self.delay)
            return {"LST_Day_1km": 15800}

    class StubImage:
        def __init__(self, delay=0):
            self.delay = delay

        def reduceRegion(self, *a, **kw):
            return StubRegion(self.delay)

        def date(self):
            return StubDate()

    class StubCollection:
        def __init__(self, delay=0):
            self.delay = delay

        def filterBounds(self, *a):
            return self

        def filterDate(self, *a):
            return self

        def select(self, *a):
            return self

        def sort(self, *a):
            return self

        def first(self):
            return StubImage(self.delay)

    class StubEE:
        Reducer = StubReducer
        Geometry = StubGeometry

        def __init__(self, delay=0):
            self.delay = delay

        def ImageCollection(self, name):
            return StubCollection(self.delay)

    # Slow getInfo stub (sleeps 5s with timeout=0.2s) -> must return UNAVAILABLE in < 1s
    svc.ee = StubEE(delay=5.0)
    start = time.time()
    slow_data = svc.extract_satellite_metrics(24.8, 67.0, timeout_s=0.2)
    elapsed = time.time() - start
    assert slow_data["status"] == "unavailable"
    assert elapsed < 1.0, f"Slow call took {elapsed}s; timeout was not enforced"

    # Fast getInfo stub -> returns real data with status ok
    svc.ee = StubEE(delay=0)
    fast_data = svc.extract_satellite_metrics(24.8, 67.0, timeout_s=1.0)
    assert fast_data["status"] == "ok"
    assert fast_data["lst"] == round(15800 * 0.02 - 273.15, 1)
