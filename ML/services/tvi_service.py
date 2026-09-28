"""Phase 5 TVI-lite: Thermal Vulnerability Index.

TVI = 0.5·norm(heatScore) + 0.3·norm(reportDensity) + 0.2·norm(popDensity)

Each component is normalized to 0–1 by dividing by its documented cap
(config.TVI_*_CAP) and clamping; values above the cap saturate at 1.0.
Missing components (None) are EXCLUDED and the remaining weights
renormalize proportionally — the hotspot never gets a fake 0 for data it
doesn't have, and ``weightsUsed`` records exactly what the score rests on.

This module is pure math (no DB, no I/O) so the FYP report can hand-verify
every number. See README "TVI-lite" for the worked example.
"""
from config import (
    TVI_HEAT_WEIGHT,
    TVI_REPORT_WEIGHT,
    TVI_POP_WEIGHT,
    TVI_HEAT_MAX,
    TVI_REPORT_DENSITY_CAP,
    TVI_POP_DENSITY_CAP,
)

_BASE_WEIGHTS = {
    "heat": TVI_HEAT_WEIGHT,
    "reports": TVI_REPORT_WEIGHT,
    "population": TVI_POP_WEIGHT,
}

# heatScore: 0–100 fusion output. reportDensity: reports in the hotspot.
# popDensity: persons/km² at the hotspot centroid (static WorldPop grid).
_CAPS = {
    "heat": TVI_HEAT_MAX,
    "reports": TVI_REPORT_DENSITY_CAP,
    "population": TVI_POP_DENSITY_CAP,
}


def _normalize(value, cap):
    """Scale to 0–1 against the cap; None stays None (missing, not zero)."""
    if value is None:
        return None
    try:
        v = float(value)
    except (TypeError, ValueError):
        return None
    if v != v:  # NaN is missing data, not a score
        return None
    return max(0.0, min(1.0, v / cap))


def compute_tvi(heat_score, report_count, pop_density):
    """Compute the TVI-lite score and its component breakdown.

    Returns {"tvi", "components", "weightsUsed", "note"} where ``tvi`` is
    None only when NO component has data (a hotspot with nothing measurable
    gets no score rather than a fabricated one).
    """
    components = {
        name: _normalize(value, _CAPS[name])
        for name, value in (
            ("heat", heat_score),
            ("reports", report_count),
            ("population", pop_density),
        )
    }
    available = {k: v for k, v in components.items() if v is not None}
    if not available:
        return {
            "tvi": None,
            "components": components,
            "weightsUsed": {},
            "note": "no component data available — score withheld, not zeroed",
        }
    total_weight = sum(_BASE_WEIGHTS[k] for k in available)
    weights_used = {
        k: round(_BASE_WEIGHTS[k] / total_weight, 4) for k in available
    }
    tvi = round(
        sum(available[k] * weights_used[k] for k in available), 4
    )
    note = (
        None
        if len(available) == 3
        else f"partial data: {sorted(available)} used, "
             f"{sorted(set(components) - set(available))} missing (weights renormalized)"
    )
    return {
        "tvi": tvi,
        "components": components,
        "weightsUsed": weights_used,
        "note": note,
    }
