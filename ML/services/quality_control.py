"""Phase 3 quality control: compare like with like.

Every check cross-validates the citizen report against an INDEPENDENT signal.
Four base checks:

1. ``citizen_temp_vs_weather`` — citizen-measured temperature vs the weather
   provider's air temperature. Tolerance ±3 °C.
2. ``severity_vs_surface_air_excess`` — reported severity vs the satellite
   LST *surface-air excess* (``lst - weather_air_temp``), NOT absolute LST.
   A severity-5 claim in winter is judged against how much hotter the
   surface is than the air, not against a summer number.
   Expected excess per severity band is a coarse heuristic climatological
   band (documented below); the ±8 °C tolerance keeps this a spoof filter,
   not a precision instrument.
3. ``gps_plausibility`` — coordinates present, in range, not null-island,
   and inside a known demo-city bounding box (config.CITY_BOUNDS).
4. ``photo_presence`` — SOFT check: recorded for the record, never flips
   the verdict on its own.

A fifth check, ``environmental_evidence``, is appended only when NEITHER
environmental check (1 nor 2) could run: it records the failure and forces
the verdict to "suspect" — GPS plausibility alone never verifies a report.

Signals that are None (unavailable) are SKIPPED — never replaced with
invented defaults. A skipped check is neutral.

The old ``severity * 8`` proxy (which turned a 1–5 severity into a fake
"temperature" and compared it against real thermometers) is deleted.

Verdict: "pass" when no hard check fails, "suspect" otherwise.
Score: 1.0 − 0.35 per failed hard check, clamped to [0, 1].

Independent environmental-evidence policy: GPS plausibility alone can never
verify a report. At least one independent environmental check
(``citizen_temp_vs_weather`` or ``severity_vs_surface_air_excess``) must
have actually run — not been skipped. When weather and satellite are both
unavailable, the verdict is "suspect" (score capped at 0.5) and the report
goes to human moderation, even if the GPS check passed. Absence of evidence
is not evidence of absence.
"""

from config import (
    CITY_BOUNDS,
    QC_TEMP_TOLERANCE_C,
    QC_ANOMALY_TOLERANCE_C,
    QC_SCORE_PENALTY_PER_FAILURE,
)

# Single source of truth lives in config.py (env-overridable); these aliases
# keep the check logic below readable.
TEMP_TOLERANCE_C = QC_TEMP_TOLERANCE_C
ANOMALY_TOLERANCE_C = QC_ANOMALY_TOLERANCE_C
SCORE_PENALTY_PER_FAILURE = QC_SCORE_PENALTY_PER_FAILURE

# Expected surface-air temperature excess (°C) per severity band.
# Heuristic bands for South-Asian summer daytime urban heat: a "mild"
# report should show the surface only slightly warmer than the air,
# while a "severe" report should show a strong surface excess.
# Coarse is fine — the wide tolerance is what makes this honest.
EXPECTED_ANOMALY_BY_SEVERITY = {
    1: 2.0,
    2: 5.0,
    3: 8.0,
    4: 12.0,
    5: 16.0,
}


def _num(value):
    try:
        if value is None:
            return None
        n = float(value)
    except (TypeError, ValueError):
        return None
    # NaN / infinities are not measurements.
    if n != n or n in (float("inf"), float("-inf")):
        return None
    return n


def _check(name, result, detail):
    return {"name": name, "result": result, "detail": detail}


def _inside_bounds(lat, lng, bounds):
    (lat_min, lat_max), (lng_min, lng_max) = bounds["lat"], bounds["lng"]
    return lat_min <= lat <= lat_max and lng_min <= lng <= lng_max


def run_quality_checks(report, weather_snapshot=None, satellite_data=None, city_bounds=None):
    """Run the four QC checks on a report dict.

    ``report``: Mongo report document (dict) with latitude/longitude,
    severityLevel/severity, ambientTemp/temperature, image/images, city.
    ``weather_snapshot``: weathersnapshots row (needs ``temperature`` —
    the provider air temp — and optionally ``heatIndex``).
    ``satellite_data``: gee_service payload (needs ``lst``); pass None or
    an "unavailable" payload when the satellite term is missing.
    """
    report = report or {}
    weather_snapshot = weather_snapshot or {}
    satellite_data = satellite_data or {}
    bounds = city_bounds or CITY_BOUNDS

    checks = []
    failures = 0

    citizen_temp = _num(
        report.get("ambientTemp")
        if report.get("ambientTemp") is not None
        else report.get("temperature")
    )
    weather_temp = _num(weather_snapshot.get("temperature"))

    # ── Check 1: citizen temperature vs weather air temperature ──────────
    if citizen_temp is None or weather_temp is None:
        checks.append(_check(
            "citizen_temp_vs_weather", "skipped",
            "citizen or provider temperature unavailable — no invented comparison",
        ))
    else:
        diff = abs(citizen_temp - weather_temp)
        if diff <= TEMP_TOLERANCE_C:
            checks.append(_check(
                "citizen_temp_vs_weather", "pass",
                f"|{citizen_temp} − {weather_temp}| = {round(diff, 1)}°C ≤ {TEMP_TOLERANCE_C}°C",
            ))
        else:
            failures += 1
            checks.append(_check(
                "citizen_temp_vs_weather", "fail",
                f"|{citizen_temp} − {weather_temp}| = {round(diff, 1)}°C > {TEMP_TOLERANCE_C}°C",
            ))

    # ── Check 2: severity vs satellite LST anomaly (surface-air excess) ──
    severity = _num(
        report.get("severityLevel")
        if report.get("severityLevel") is not None
        else report.get("severity")
    )
    lst = _num(satellite_data.get("lst"))
    if severity is None or lst is None or weather_temp is None:
        checks.append(_check(
            "severity_vs_surface_air_excess", "skipped",
            "severity, satellite LST, or provider air temp unavailable",
        ))
    else:
        band = int(round(severity))
        expected = EXPECTED_ANOMALY_BY_SEVERITY.get(band)
        anomaly = lst - weather_temp
        if expected is None:
            checks.append(_check(
                "severity_vs_surface_air_excess", "skipped",
                f"severity {severity} outside the 1–5 bands",
            ))
        elif abs(anomaly - expected) <= ANOMALY_TOLERANCE_C:
            checks.append(_check(
                "severity_vs_surface_air_excess", "pass",
                f"severity {band}: surface-air excess {round(anomaly, 1)}°C "
                f"within {expected}±{ANOMALY_TOLERANCE_C}°C",
            ))
        else:
            failures += 1
            checks.append(_check(
                "severity_vs_surface_air_excess", "fail",
                f"severity {band}: surface-air excess {round(anomaly, 1)}°C "
                f"outside {expected}±{ANOMALY_TOLERANCE_C}°C",
            ))

    # ── Check 3: GPS plausibility ───────────────────────────────────────
    lat = _num(report.get("latitude"))
    if lat is None:
        lat = _num((report.get("location") or {}).get("lat"))
    lng = _num(report.get("longitude"))
    if lng is None:
        lng = _num((report.get("location") or {}).get("lng"))

    gps_detail = None
    if lat is None or lng is None:
        gps_detail = "coordinates missing"
    elif not (-90 <= lat <= 90 and -180 <= lng <= 180):
        gps_detail = f"coordinates out of range ({lat}, {lng})"
    elif lat == 0 and lng == 0:
        gps_detail = "null-island coordinates (0, 0)"
    else:
        city = (report.get("city") or "").strip()
        if city and city in bounds:
            inside = _inside_bounds(lat, lng, bounds[city])
            gps_detail = None if inside else f"outside {city} bounds"
        else:
            inside_any = any(_inside_bounds(lat, lng, b) for b in bounds.values())
            gps_detail = None if inside_any else "outside all known city bounds"

    if gps_detail is None:
        checks.append(_check("gps_plausibility", "pass", f"({lat}, {lng}) plausible"))
    else:
        failures += 1
        checks.append(_check("gps_plausibility", "fail", gps_detail))

    # ── Check 4: photo presence (soft — recorded, never fails the report) ─
    has_photo = bool(report.get("image") or report.get("images"))
    checks.append(_check(
        "photo_presence",
        "pass" if has_photo else "warning",
        "photo attached" if has_photo else "no photo attached (informational only)",
    ))

    verdict = "suspect" if failures else "pass"
    score = round(max(0.0, 1.0 - SCORE_PENALTY_PER_FAILURE * failures), 2)

    # ── Independent environmental-evidence policy ─────────────────────────
    # GPS plausibility alone must never verify a report. Require at least
    # one independent environmental check to have actually run; when both
    # the weather and satellite signals are unavailable, the report is
    # "suspect" and goes to human moderation — even with a passing GPS
    # check and zero hard failures. The appended check makes the reason
    # visible in the admin audit trail.
    environmental_names = (
        "citizen_temp_vs_weather",
        "severity_vs_surface_air_excess",
    )
    environmental_ran = any(
        c["name"] in environmental_names and c["result"] != "skipped"
        for c in checks
    )
    if not environmental_ran:
        checks.append(_check(
            "environmental_evidence",
            "fail",
            "no independent environmental signal available (weather and "
            "satellite both unavailable) — GPS plausibility alone cannot "
            "verify; queued for human review",
        ))
        verdict = "suspect"
        score = round(min(score, 0.5), 2)

    return {"verdict": verdict, "score": score, "checks": checks}
