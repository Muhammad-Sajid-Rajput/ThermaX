"""Phase 0 tests for the heat fusion score.

These pin the current formula so later phases (weight calibration, TVI-lite)
can change it deliberately instead of accidentally.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from services.fusion_service import calculate_fusion_score


def hand_computed_heat_score(severity_level, heat_index_c, satellite_lst_c):
    citizen = (max(1.0, min(5.0, severity_level)) / 5.0) * 100.0
    weather = max(0.0, min(100.0, ((heat_index_c - 25.0) / 25.0) * 100.0))
    satellite = max(0.0, min(100.0, ((satellite_lst_c - 30.0) / 25.0) * 100.0))
    return round(0.30 * citizen + 0.35 * weather + 0.35 * satellite, 1)


def test_heat_score_matches_hand_computation():
    result = calculate_fusion_score(
        severity_level=4, heat_index_c=40.0, satellite_lst_c=45.0
    )
    assert result["heatScore"] == hand_computed_heat_score(4, 40.0, 45.0) == 66.0


def test_risk_level_thresholds():
    assert (
        calculate_fusion_score(5, 50.0, 55.0)["heatRiskLevel"] == "extreme"
    )
    assert (
        calculate_fusion_score(1, 20.0, 25.0)["heatRiskLevel"] == "low"
    )


def test_scores_are_clamped_to_0_100():
    result = calculate_fusion_score(
        severity_level=99, heat_index_c=200.0, satellite_lst_c=-50.0
    )
    assert 0.0 <= result["heatScore"] <= 100.0


def test_result_carries_expected_keys():
    result = calculate_fusion_score(
        severity_level=3, heat_index_c=38.0, satellite_lst_c=42.0
    )
    assert set(result.keys()) == {
        "heatScore",
        "heatRiskLevel",
        "qualityControlScore",
        "sources",
    }


def test_satellite_unavailable_renormalizes_weights():
    """Phase 2: a missing satellite signal is excluded, not fabricated.

    Remaining weights (citizen 0.30, weather 0.35) are renormalized over 0.65.
    """
    result = calculate_fusion_score(
        severity_level=4, heat_index_c=40.0, satellite_lst_c=None
    )
    citizen = (4.0 / 5.0) * 100.0  # 80.0
    weather = ((40.0 - 25.0) / 25.0) * 100.0  # 60.0
    expected = round((0.30 * citizen + 0.35 * weather) / 0.65, 1)
    assert result["heatScore"] == expected
    assert result["sources"]["satellite"] is None
    assert result["sources"]["weather"] == "WeatherAPI (weatherapi.com)"


def test_all_signals_unavailable_except_citizen():
    result = calculate_fusion_score(
        severity_level=5, heat_index_c=None, satellite_lst_c=None
    )
    assert result["heatScore"] == 100.0
    assert result["heatRiskLevel"] == "extreme"
    assert result["sources"]["satellite"] is None
    assert result["sources"]["weather"] is None
