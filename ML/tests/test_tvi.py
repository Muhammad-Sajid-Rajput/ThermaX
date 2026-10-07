"""Phase 5 TVI-lite tests: hand-computed values, edge cases, pop-grid lookup.

The worked example here doubles as the README's documented example —
if these numbers change, the README must change with them.
"""
import math

import pytest

from services.tvi_service import compute_tvi
from services import pop_grid


def test_tvi_hand_computed_full_example():
    # heat=80 → 0.8 | reports=10 → 10/20=0.5 | pop=25000 → 25000/50000=0.5
    # TVI = 0.5*0.8 + 0.3*0.5 + 0.2*0.5 = 0.40 + 0.15 + 0.10 = 0.65
    r = compute_tvi(80, 10, 25000)
    assert r["tvi"] == pytest.approx(0.65)
    assert r["components"] == {"heat": 0.8, "reports": 0.5, "population": 0.5}
    assert r["weightsUsed"] == {"heat": 0.5, "reports": 0.3, "population": 0.2}
    assert r["note"] is None


def test_tvi_saturation_at_caps():
    r = compute_tvi(150, 100, 999999)  # all above caps → all 1.0
    assert r["components"] == {"heat": 1.0, "reports": 1.0, "population": 1.0}
    assert r["tvi"] == pytest.approx(1.0)


def test_tvi_all_zero_is_zero_not_none():
    r = compute_tvi(0, 0, 0)
    assert r["tvi"] == 0.0
    assert r["note"] is None


def test_tvi_missing_heat_renormalizes_weights():
    # heat missing → excluded, NOT zeroed. Remaining weights renormalize:
    # reports 0.3/0.5=0.6, population 0.2/0.5=0.4 → 0.5*0.6 + 0.5*0.4 = 0.5
    r = compute_tvi(None, 10, 25000)
    assert r["components"]["heat"] is None
    assert r["tvi"] == pytest.approx(0.5)
    assert r["weightsUsed"] == {"reports": 0.6, "population": 0.4}
    assert "heat" in r["note"] and "renormalized" in r["note"]


def test_tvi_no_data_withholds_score():
    r = compute_tvi(None, None, None)
    assert r["tvi"] is None
    assert r["weightsUsed"] == {}


def test_tvi_nan_and_negative_inputs():
    r = compute_tvi(float("nan"), -5, 25000)
    assert r["components"]["heat"] is None      # NaN = missing
    assert r["components"]["reports"] == 0.0    # negative clamps to 0
    assert r["tvi"] == pytest.approx(0.2)       # 0.0*0.6 + 0.5*0.4


def test_tvi_weights_sum_to_one_on_partial_data():
    r = compute_tvi(90, None, None)
    assert r["tvi"] == pytest.approx(0.9)       # single component → weight 1.0
    assert r["weightsUsed"] == {"heat": 1.0}


# ─── Population grid lookups (graceful degradation when files absent) ─────

def test_pop_grid_missing_files_returns_none_gracefully():
    # Without local pop_grid files, pop_density_at returns None safely so TVI renormalizes
    assert pop_grid.pop_density_at("Karachi", 24.8607, 67.0011) is None
    assert pop_grid.pop_density_at("Lahore", 31.5204, 74.3587) is None
    assert pop_grid.pop_density_at("Islamabad", 33.6844, 73.0479) is None


def test_pop_grid_sea_point_returns_none():
    assert pop_grid.pop_density_at("Karachi", 24.0, 66.0) is None


def test_pop_grid_unknown_city_returns_none():
    assert pop_grid.pop_density_at("Atlantis", 24.86, 67.0) is None
