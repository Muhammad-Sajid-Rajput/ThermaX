"""Phase 6: deterministic directives engine + citizen advisories.

No ML, no LLM, no open-ended generation — pure lookup tables.

- ``riskTier`` is derived from the TVI-lite score (0–1) via documented
  operational thresholds in config.py. A hotspot with ``tvi=None`` (no
  component data) gets tier ``"unknown"``: no directives and no advisory
  are issued for it, honestly, instead of a default tier.
- Directives are ``riskTier x context`` lookups for admins. Context keys
  are restricted to signals that actually exist per hotspot (severity
  band, population-density band, report-count band, peak-temp band, data
  completeness) — there is no POI/land-use feed, so "school-nearby"-style
  contexts cannot be keyed on and are not pretended.
- Citizen advisories are ``tier (+ heat-index band)`` templates in
  English + Urdu. The heat index is the mean of member reports' weather
  snapshots (members without one are excluded, never zeroed); when no
  member has a heat index the band is ``"unknown"`` and the tier advisory
  stands alone. Medical guidance stays within standard heat-illness
  first response (shade, water, seek care) — no diagnosis, no dosage.
"""

from config import (
    TVI_TIER_CRITICAL,
    TVI_TIER_HIGH,
    TVI_TIER_MODERATE,
    HEAT_INDEX_EXTREME,
    HEAT_INDEX_HIGH,
    POP_DENSITY_HIGH,
    PEAK_TEMP_EXTREME,
    TVI_REPORT_DENSITY_CAP,
)

# Canonical risk-tier vocabulary. NOTE: this is intentionally distinct from
# the cluster ``severity`` vocabulary (critical/high/moderate/unknown,
# peak-temp based) and the fusion ``risk_level`` vocabulary
# (extreme/high/moderate/low, heatScore based). riskTier answers "how
# vulnerable is this place?" (TVI); severity answers "how hot did it get?".
RISK_TIERS = ("low", "moderate", "high", "critical")
UNKNOWN_TIER = "unknown"

# Heat-index bands (°C). "unknown" when no member report has a heat index.
HEAT_BANDS = ("moderate", "high", "extreme", "unknown")


def assign_risk_tier(tvi):
    """Map a TVI-lite score (0–1) to a canonical risk tier.

    ``tvi=None`` (or non-finite) → ``"unknown"``: unscored hotspots get no
    tier rather than a fabricated one.
    """
    if tvi is None:
        return UNKNOWN_TIER
    try:
        v = float(tvi)
    except (TypeError, ValueError):
        return UNKNOWN_TIER
    if v != v:  # NaN
        return UNKNOWN_TIER
    if v >= TVI_TIER_CRITICAL:
        return "critical"
    if v >= TVI_TIER_HIGH:
        return "high"
    if v >= TVI_TIER_MODERATE:
        return "moderate"
    return "low"


def heat_index_band(heat_index):
    """Map a heat-index value (°C) to a band for advisory escalation."""
    if heat_index is None:
        return "unknown"
    try:
        v = float(heat_index)
    except (TypeError, ValueError):
        return "unknown"
    if v != v:
        return "unknown"
    if v >= HEAT_INDEX_EXTREME:
        return "extreme"
    if v >= HEAT_INDEX_HIGH:
        return "high"
    return "moderate"


# ─── Admin directives: tier × context ──────────────────────────────────────
# Base set per tier (deterministic IDs; English working language for admins).
TIER_DIRECTIVES = {
    "critical": [
        {
            "id": "open-cooling-centers",
            "text": "Open public cooling centers in the affected area — schools, "
                    "community halls, and mosques with cooling after prayer hours.",
        },
        {
            "id": "shift-outdoor-work",
            "text": "Shift outdoor labor, construction, and school outdoor "
                    "activities away from 11:00–16:00.",
        },
        {
            "id": "heat-emergency-notify",
            "text": "Issue a public heat-emergency notification for the affected "
                    "zone through local administration channels.",
        },
        {
            "id": "water-points",
            "text": "Deploy drinking-water distribution points at major "
                    "intersections and transit stops in the zone.",
        },
        {
            "id": "hospital-alert",
            "text": "Alert nearby hospitals, basic health units, and ambulance "
                    "services for a heat-illness surge.",
        },
    ],
    "high": [
        {
            "id": "reduce-midday-outdoor",
            "text": "Advise reduced outdoor activity between 12:00–15:00 via "
                    "mosque announcements and local cable.",
        },
        {
            "id": "vulnerable-check",
            "text": "Direct community health workers to check on elderly "
                    "residents, infants, and outdoor workers.",
        },
        {
            "id": "advisory-broadcast",
            "text": "Broadcast the citizen heat advisory for this zone.",
        },
    ],
    "moderate": [
        {
            "id": "standard-advisory",
            "text": "Issue the standard heat advisory for the area.",
        },
        {
            "id": "monitor-volume",
            "text": "Monitor incoming reports; escalate if report volume doubles "
                    "within 24 hours.",
        },
    ],
    "low": [
        {
            "id": "routine-monitor",
            "text": "Routine monitoring — no action required beyond the regular "
                    "pipeline tick.",
        },
    ],
    UNKNOWN_TIER: [],
}

# Contextual overlays: (predicate on context, directives appended after the
# base set). Context keys come only from signals that exist per hotspot.
CONTEXT_RULES = [
    (
        lambda ctx: ctx.get("popBand") == "high",
        [
            {
                "id": "dense-pop-priority",
                "text": "Prioritize the densest blocks for cooling-center "
                        "placement and water points.",
            },
        ],
    ),
    (
        lambda ctx: ctx.get("severityBand") == "critical",
        [
            {
                "id": "disaster-coord",
                "text": "Coordinate with the district disaster management "
                        "authority (DDMA/PDMA) for the affected zone.",
            },
        ],
    ),
    (
        lambda ctx: ctx.get("tempBand") == "extreme",
        [
            {
                "id": "extreme-temp-protocol",
                "text": "Activate extreme-temperature protocol: extend "
                        "cooling-center hours to 22:00 and double water-point "
                        "coverage.",
            },
        ],
    ),
    (
        lambda ctx: ctx.get("reportBand") == "high",
        [
            {
                "id": "verify-coverage",
                "text": "High report volume — verify on-ground coverage before "
                        "scaling the response down.",
            },
        ],
    ),
    (
        lambda ctx: ctx.get("completeness") == "partial",
        [
            {
                "id": "provisional-note",
                "text": "Treat these directives as provisional — this hotspot "
                        "was scored with partial data (see TVI note).",
            },
        ],
    ),
]


def build_context(scored, pop_density_raw=None):
    """Derive the honest context dict for a scored hotspot.

    ``scored`` is the cluster dict from ``score_clusters`` (has severity,
    reportCount, peakTemp, tviWeightsUsed). ``pop_density_raw`` is
    persons/km² at the centroid (recomputed via pop_grid; the persisted
    tviComponents only keep the normalized value, which saturates at the
    cap). Every band has an explicit "unknown"/fallback — nothing is
    inferred from missing data.
    """
    severity = scored.get("severity")
    severity_band = severity if severity in (
        "critical", "high", "moderate", "unknown") else "unknown"

    if pop_density_raw is None:
        pop_band = "unknown"
    else:
        try:
            pop_band = "high" if float(
                pop_density_raw) >= POP_DENSITY_HIGH else "low"
        except (TypeError, ValueError):
            pop_band = "unknown"

    try:
        rc = int(scored.get("reportCount") or 0)
    except (TypeError, ValueError):
        rc = 0
    # "high" report band at half the TVI saturation cap (documented).
    report_band = "high" if rc >= TVI_REPORT_DENSITY_CAP / 2 else "low"

    peak = scored.get("peakTemp")
    try:
        peak_v = float(peak) if peak is not None else None
    except (TypeError, ValueError):
        peak_v = None
    if peak_v is None or peak_v != peak_v:
        temp_band = "unknown"
    elif peak_v >= PEAK_TEMP_EXTREME:
        temp_band = "extreme"
    elif peak_v >= 40.0:
        temp_band = "high"
    elif peak_v >= 35.0:
        temp_band = "moderate"
    else:
        temp_band = "low"

    weights_used = scored.get("tviWeightsUsed") or {}
    if scored.get("tvi") is None:
        completeness = "none"
    elif len(weights_used) >= 3:
        completeness = "full"
    else:
        completeness = "partial"

    return {
        "severityBand": severity_band,
        "popBand": pop_band,
        "reportBand": report_band,
        "tempBand": temp_band,
        "completeness": completeness,
    }


def get_directives(tier, context):
    """Deterministic ``tier x context`` directive lookup.

    Returns a list of ``{"id", "text"}`` — base set for the tier plus every
    contextual overlay whose predicate holds, deduplicated by id, in table
    order. ``"unknown"`` tier → ``[]`` (no directives without a scored
    tier).
    """
    if tier not in RISK_TIERS:
        return []
    seen = set()
    out = []
    for d in TIER_DIRECTIVES.get(tier, []):
        if d["id"] not in seen:
            seen.add(d["id"])
            out.append(dict(d))
    context = context or {}
    for predicate, directives in CONTEXT_RULES:
        try:
            holds = bool(predicate(context))
        except Exception:
            holds = False
        if holds:
            for d in directives:
                if d["id"] not in seen:
                    seen.add(d["id"])
                    out.append(dict(d))
    return out


# ─── Citizen advisories: tier (+ heat-index band), EN + UR ─────────────────
ADVISORY_TEMPLATES = {
    "critical": {
        "en": "Extreme heat danger in your area. Stay indoors between 11am and "
              "4pm, drink water frequently, and check on elderly neighbours. "
              "If you feel dizzy or nauseous, or stop sweating, move to shade "
              "and seek medical help immediately.",
        "ur": "آپ کے علاقے میں شدید گرمی کا خطرہ ہے۔ صبح 11 سے شام 4 بجے تک "
              "گھر کے اندر رہیں، بار بار پانی پئیں اور بزرگ ہمسایوں کا خیال "
              "رکھیں۔ اگر چکر آئیں، متلی ہو یا پسینہ آنا بند ہو جائے تو فوراً "
              "سائے میں جائیں اور طبی مدد حاصل کریں۔",
    },
    "high": {
        "en": "High heat in your area. Limit outdoor activity between 12pm and "
              "3pm, drink water regularly, and wear light, loose clothing. "
              "Watch for headache, dizziness, or heavy sweating — rest in "
              "shade if any appear.",
        "ur": "آپ کے علاقے میں تیز گرمی ہے۔ دوپہر 12 سے 3 بجے تک باہر کے کام "
              "محدود کریں، باقاعدگی سے پانی پئیں اور ہلکے ڈھیلے کپڑے پہنیں۔ "
              "سر درد، چکر یا زیادہ پسینے کی صورت میں سائے میں آرام کریں۔",
    },
    "moderate": {
        "en": "Warm conditions in your area. Drink extra water and take shade "
              "breaks if you work outdoors.",
        "ur": "آپ کے علاقے میں موسم گرم ہے۔ زیادہ پانی پئیں اور باہر کام "
              "کرتے وقت سائے میں وقفہ لیں۔",
    },
    "low": {
        "en": "Heat levels are normal in your area. No special precautions needed.",
        "ur": "آپ کے علاقے میں گرمی معمول کے مطابق ہے۔ کسی خاص احتیاط کی "
              "ضرورت نہیں۔",
    },
}

# Appended when the heat-index band is "extreme" — deterministic escalation.
EXTREME_HEAT_SUFFIX = {
    "en": " Heat index is extremely high — avoid all non-essential outdoor activity.",
    "ur": " ہیٹ انڈیکس انتہائی زیادہ ہے — غیر ضروری باہر کے کاموں سے مکمل پرہیز کریں۔",
}


def get_advisory(tier, heat_index=None):
    """Return the citizen advisory for a tier (+ heat-index band).

    Returns ``{"en", "ur", "tier", "heatIndexBand", "heatIndex"}`` or
    ``None`` when the tier is ``"unknown"`` — no advisory is issued without
    a scored tier. ``heat_index=None`` → band ``"unknown"``; the tier
    template stands alone, never a fabricated number.
    """
    if tier not in RISK_TIERS:
        return None
    template = ADVISORY_TEMPLATES[tier]
    band = heat_index_band(heat_index)
    en = template["en"]
    ur = template["ur"]
    if band == "extreme":
        en += EXTREME_HEAT_SUFFIX["en"]
        ur += EXTREME_HEAT_SUFFIX["ur"]
    hi = None
    if heat_index is not None:
        try:
            hi = round(float(heat_index), 1)
        except (TypeError, ValueError):
            hi = None
    return {
        "en": en,
        "ur": ur,
        "tier": tier,
        "heatIndexBand": band,
        "heatIndex": hi,
    }


# ─── Pipeline attachment ───────────────────────────────────────────────────
def mean_heat_index(db, member_report_ids):
    """Mean heatIndex across a hotspot's member reports.

    Follows each member's ``weatherSnapshotRef`` to its weather snapshot and
    averages the ``heatIndex`` values found. Members without a snapshot (or
    without a heatIndex) are excluded — never scored as 0. Returns None when
    no member has a heat index.
    """
    import importlib

    ids = []
    for mid in member_report_ids or []:
        ids.append(mid)
        try:
            bson = importlib.import_module("bson")
            ids.append(bson.ObjectId(str(mid)))
        except Exception:
            pass
    if not ids:
        return None
    values = []
    for report in db.reports.find({"_id": {"$in": ids}}, {"weatherSnapshotRef": 1}):
        ws_ref = report.get("weatherSnapshotRef")
        if not ws_ref:
            continue
        snap = db.weathersnapshots.find_one({"_id": ws_ref}, {"heatIndex": 1})
        hi = (snap or {}).get("heatIndex")
        if isinstance(hi, bool):
            continue
        try:
            v = float(hi)
        except (TypeError, ValueError):
            continue
        if v == v:  # exclude NaN
            values.append(v)
    if not values:
        return None
    return round(sum(values) / len(values), 1)


def attach_phase6(db, city, scored):
    """Compute Phase 6 fields for one scored cluster.

    Pure derivation (+ the member heat-index lookup, same pattern as the
    mean-heatScore lookup in scheduled_pipeline). Returns the dict to merge
    into the hotspot document before atomic publication — readers never see
    a hotspot without its directives/advisory.
    """
    from services.pop_grid import pop_density_at

    centroid = scored.get("centroid") or {}
    tier = assign_risk_tier(scored.get("tvi"))
    heat_index = mean_heat_index(db, scored.get("memberReportIds"))
    pop_raw = pop_density_at(city, centroid.get("lat"), centroid.get("lng"))
    context = build_context(scored, pop_raw)
    return {
        "riskTier": tier,
        "directives": get_directives(tier, context),
        "advisory": get_advisory(tier, heat_index),
        "heatIndexMean": heat_index,
        "directiveContext": context,
    }
