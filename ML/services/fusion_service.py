"""Heat fusion score.

Weights (all signals present): citizen 0.30, weather 0.35, satellite 0.35.
When a signal is missing (None = unavailable, never fabricated), its weight
is redistributed proportionally over the remaining signals, so missing data
neither inflates nor deflates the score silently. The `sources` map records
exactly which signals contributed.

Quality control is NOT computed here. The caller runs
``services.quality_control.run_quality_checks`` and passes the result in as
``qc_result``; ``qualityControlScore`` is then the QC score. Without a QC
result the score is None ("not assessed") — the old ``severity * 8`` proxy,
which laundered a 1–5 severity into a fake temperature, is deleted.
"""
import math

BASE_WEIGHTS = {"citizen": 0.30, "weather": 0.35, "satellite": 0.35}


def _risk_level(heat_score: float) -> str:
    if heat_score >= 75.0:
        return "extreme"
    if heat_score >= 55.0:
        return "high"
    if heat_score >= 35.0:
        return "moderate"
    return "low"


def _finite_or_none(value):
    """Coerce to a finite float, or None when absent/non-numeric/non-finite.

    NaN and ±inf are treated as unavailable — they must never flow into a
    score or be persisted to MongoDB (BSON NaN breaks JSON serialization
    for the frontend).
    """
    if value is None or isinstance(value, bool):
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def calculate_fusion_score(severity_level: float, heat_index_c=None, satellite_lst_c=None, qc_result=None) -> dict:
    severity = _finite_or_none(severity_level)
    if severity is None:
        # No fabrication: a missing/non-numeric severity cannot produce a
        # citizen score, so fusion refuses instead of inventing severity 3.
        raise ValueError("severity_level is required and must be a finite number")
    citizen_score = (max(1.0, min(5.0, severity)) / 5.0) * 100.0

    # Non-finite readings are unavailable, never scored.
    heat_index_c = _finite_or_none(heat_index_c)
    satellite_lst_c = _finite_or_none(satellite_lst_c)

    terms = [("citizen", BASE_WEIGHTS["citizen"], citizen_score)]
    if heat_index_c is not None:
        weather_score = max(0.0, min(100.0, ((heat_index_c - 25.0) / 25.0) * 100.0))
        terms.append(("weather", BASE_WEIGHTS["weather"], weather_score))
    if satellite_lst_c is not None:
        satellite_score = max(0.0, min(100.0, ((satellite_lst_c - 30.0) / 25.0) * 100.0))
        terms.append(("satellite", BASE_WEIGHTS["satellite"], satellite_score))

    total_weight = sum(w for _, w, _ in terms)
    heat_score = round(sum(w * s for _, w, s in terms) / total_weight, 1)

    used = {name for name, _, _ in terms}
    return {
        "heatScore": heat_score,
        "heatRiskLevel": _risk_level(heat_score),
        "qualityControlScore": qc_result.get("score") if isinstance(qc_result, dict) else None,
        "sources": {
            "sensor": True,
            "satellite": "MODIS LST (GEE)" if "satellite" in used else None,
            "weather": "WeatherAPI (weatherapi.com)" if "weather" in used else None,
        },
    }
