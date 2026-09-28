"""Phase 2 tests for the GEE satellite service.

Data-integrity rule under test: the service never invents LST/NDVI values.
When Earth Engine is unavailable it must return an explicit "unavailable"
payload with null measurements.
"""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from services.gee_service import gee_service, UNAVAILABLE


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
