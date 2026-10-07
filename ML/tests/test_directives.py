"""Phase 6 tests: deterministic directives engine + citizen advisories.

Every test below is table-driven against the lookup tables in
services/directives_service.py — no randomness, no network, no model.
If a table's expected output changes, the table changed, and that is a
deliberate product decision, not a test bug.
"""
import pytest

from services.directives_service import (
    assign_risk_tier,
    heat_index_band,
    build_context,
    get_directives,
    get_advisory,
    mean_heat_index,
    attach_phase6,
    TIER_DIRECTIVES,
    RISK_TIERS,
    UNKNOWN_TIER,
)


# ─── riskTier assignment ──────────────────────────────────────────────────
@pytest.mark.parametrize("tvi,expected", [
    (1.0, "critical"),
    (0.65, "critical"),      # boundary inclusive
    (0.649, "high"),
    (0.45, "high"),          # boundary inclusive
    (0.449, "moderate"),
    (0.25, "moderate"),      # boundary inclusive
    (0.249, "low"),
    (0.0, "low"),
    (None, "unknown"),       # unscored → unknown, never a default tier
    (float("nan"), "unknown"),
    ("garbage", "unknown"),
])
def test_assign_risk_tier(tvi, expected):
    assert assign_risk_tier(tvi) == expected


# ─── heat-index bands ─────────────────────────────────────────────────────
@pytest.mark.parametrize("hi,expected", [
    (50.0, "extreme"),
    (45.0, "extreme"),       # boundary inclusive
    (44.9, "high"),
    (38.0, "high"),          # boundary inclusive
    (37.9, "moderate"),
    (30.0, "moderate"),
    (None, "unknown"),       # no data → unknown, never fabricated
    (float("nan"), "unknown"),
])
def test_heat_index_band(hi, expected):
    assert heat_index_band(hi) == expected


# ─── directives: every tier × context combo ───────────────────────────────
def _ctx(**overrides):
    base = {
        "severityBand": "moderate",
        "popBand": "low",
        "reportBand": "low",
        "tempBand": "moderate",
        "completeness": "full",
    }
    base.update(overrides)
    return base


def _ids(directives):
    return [d["id"] for d in directives]


def test_directives_base_sets_per_tier():
    assert _ids(get_directives("critical", _ctx())) == [
        "open-cooling-centers", "shift-outdoor-work", "heat-emergency-notify",
        "water-points", "hospital-alert",
    ]
    assert _ids(get_directives("high", _ctx())) == [
        "reduce-midday-outdoor", "vulnerable-check", "advisory-broadcast",
    ]
    assert _ids(get_directives("moderate", _ctx())) == [
        "standard-advisory", "monitor-volume",
    ]
    assert _ids(get_directives("low", _ctx())) == ["routine-monitor"]


def test_directives_unknown_tier_is_empty():
    # Honest: no directives without a scored tier.
    assert get_directives("unknown", _ctx()) == []
    assert get_directives("banana", _ctx()) == []
    assert get_directives(None, _ctx()) == []


@pytest.mark.parametrize("context,expected_extra", [
    ({"popBand": "high"}, ["dense-pop-priority"]),
    ({"severityBand": "critical"}, ["disaster-coord"]),
    ({"tempBand": "extreme"}, ["extreme-temp-protocol"]),
    ({"reportBand": "high"}, ["verify-coverage"]),
    ({"completeness": "partial"}, ["provisional-note"]),
])
def test_directives_context_overlays_append_in_order(context, expected_extra):
    ids = _ids(get_directives("high", _ctx(**context)))
    assert ids[:3] == ["reduce-midday-outdoor", "vulnerable-check", "advisory-broadcast"]
    assert ids[3:] == expected_extra


def test_directives_all_contexts_combined_no_dupes():
    ids = _ids(get_directives("critical", _ctx(
        popBand="high", severityBand="critical", tempBand="extreme",
        reportBand="high", completeness="partial",
    )))
    assert len(ids) == len(set(ids))  # deduplicated by id
    assert len(ids) == 5 + 5  # 5 base + 5 contextual


def test_directives_text_is_deterministic():
    a = get_directives("critical", _ctx(popBand="high"))
    b = get_directives("critical", _ctx(popBand="high"))
    assert a == b
    assert all(set(d.keys()) == {"id", "text"} for d in a)
    assert all(d["text"] for d in a)


def test_tier_table_covers_all_risk_tiers():
    assert set(TIER_DIRECTIVES.keys()) == set(RISK_TIERS) | {UNKNOWN_TIER}


# ─── advisories: EN+UR per tier ────────────────────────────────────────────
@pytest.mark.parametrize("tier", RISK_TIERS)
def test_advisory_every_tier_returns_en_and_ur(tier):
    adv = get_advisory(tier)
    assert adv is not None
    assert adv["tier"] == tier
    assert adv["en"] and isinstance(adv["en"], str)
    assert adv["ur"] and isinstance(adv["ur"], str)
    assert adv["en"] != adv["ur"]  # actually translated, not copied
    assert adv["heatIndexBand"] == "unknown"  # no heat index given
    assert adv["heatIndex"] is None


def test_advisory_unknown_tier_is_none():
    assert get_advisory("unknown") is None
    assert get_advisory("banana") is None
    assert get_advisory(None) is None


def test_advisory_extreme_heat_index_appends_escalation():
    base = get_advisory("high")
    escalated = get_advisory("high", 47.5)
    assert escalated["heatIndexBand"] == "extreme"
    assert escalated["heatIndex"] == pytest.approx(47.5)
    assert escalated["en"].startswith(base["en"])
    assert len(escalated["en"]) > len(base["en"])
    assert escalated["ur"].startswith(base["ur"])
    assert len(escalated["ur"]) > len(base["ur"])


def test_advisory_non_extreme_heat_index_no_suffix():
    adv = get_advisory("critical", 40.0)
    assert adv["heatIndexBand"] == "high"
    assert adv["en"] == get_advisory("critical")["en"]


def test_advisory_ur_contains_urdu_script():
    # Guard against the UR template accidentally being English.
    adv = get_advisory("critical")
    assert any("\u0600" <= ch <= "\u06ff" for ch in adv["ur"])


# ─── context builder ─────────────────────────────────────────────────────
def test_build_context_bands():
    scored = {
        "severity": "critical",
        "reportCount": 14,
        "peakTemp": 46.2,
        "tvi": 0.7,
        "tviWeightsUsed": {"heat": 0.5, "reports": 0.3, "population": 0.2},
    }
    ctx = build_context(scored, pop_density_raw=22000)
    assert ctx == {
        "severityBand": "critical",
        "popBand": "high",       # >= 15000
        "reportBand": "high",    # >= 10 (half the TVI cap of 20)
        "tempBand": "extreme",   # >= 45
        "completeness": "full",
    }


def test_build_context_missing_data_is_honest():
    ctx = build_context(
        {"severity": None, "reportCount": 2, "peakTemp": None,
         "tvi": None, "tviWeightsUsed": {}},
        pop_density_raw=None,
    )
    assert ctx["severityBand"] == "unknown"
    assert ctx["popBand"] == "unknown"
    assert ctx["tempBand"] == "unknown"
    assert ctx["completeness"] == "none"


# ─── mean_heat_index + attach_phase6 ───────────────────────────────────────
class _Collection:
    def __init__(self, docs):
        self._docs = docs

    def find(self, query, projection=None):
        ids = query.get("_id", {}).get("$in", [])
        wanted = {str(i) for i in ids}
        return [d for d in self._docs if str(d["_id"]) in wanted]

    def find_one(self, query, projection=None):
        for d in self._docs:
            if all(d.get(k) == v for k, v in query.items()):
                return d
        return None


class _DB:
    def __init__(self, reports, snapshots):
        self.reports = _Collection(reports)
        self.weathersnapshots = _Collection(snapshots)


def test_mean_heat_index_excludes_members_without_snapshots():
    db = _DB(
        reports=[
            {"_id": "r1", "weatherSnapshotRef": "s1"},
            {"_id": "r2", "weatherSnapshotRef": "s2"},
            {"_id": "r3"},  # no snapshot — excluded, not zeroed
        ],
        snapshots=[
            {"_id": "s1", "heatIndex": 44.0},
            {"_id": "s2", "heatIndex": 40.0},
        ],
    )
    assert mean_heat_index(db, ["r1", "r2", "r3"]) == pytest.approx(42.0)


def test_mean_heat_index_none_when_no_data():
    db = _DB(reports=[{"_id": "r1"}], snapshots=[])
    assert mean_heat_index(db, ["r1"]) is None
    assert mean_heat_index(db, []) is None


def test_attach_phase6_end_to_end():
    db = _DB(
        reports=[{"_id": "r1", "weatherSnapshotRef": "s1"}],
        snapshots=[{"_id": "s1", "heatIndex": 46.0}],
    )
    scored = {
        "clusterId": "CL-01",
        "centroid": {"lat": 24.86, "lng": 67.0},
        "severity": "high",
        "reportCount": 12,
        "peakTemp": 42.0,
        "avgTemp": 40.5,
        "memberReportIds": ["r1"],
        "tvi": 0.72,
        "tviComponents": {"heat": 0.8, "reports": 0.6, "population": 0.5},
        "tviWeightsUsed": {"heat": 0.5, "reports": 0.3, "population": 0.2},
        "tviNote": None,
    }
    out = attach_phase6(db, "Karachi", scored)
    assert out["riskTier"] == "critical"  # 0.72 >= 0.65
    assert out["heatIndexMean"] == pytest.approx(46.0)
    assert out["advisory"]["tier"] == "critical"
    assert out["advisory"]["heatIndexBand"] == "extreme"
    ids = [d["id"] for d in out["directives"]]
    assert "open-cooling-centers" in ids
    assert out["directiveContext"]["reportBand"] == "high"


def test_attach_phase6_unscored_hotspot_is_honest():
    db = _DB(reports=[], snapshots=[])
    scored = {
        "clusterId": "CL-02",
        "centroid": {"lat": 24.86, "lng": 67.0},
        "severity": "unknown",
        "reportCount": 3,
        "peakTemp": None,
        "memberReportIds": [],
        "tvi": None,
        "tviComponents": {"heat": None, "reports": None, "population": None},
        "tviWeightsUsed": {},
        "tviNote": "no component data available — score withheld, not zeroed",
    }
    out = attach_phase6(db, "Karachi", scored)
    assert out["riskTier"] == "unknown"
    assert out["directives"] == []
    assert out["advisory"] is None
    assert out["heatIndexMean"] is None


# ─── end-to-end pipeline integration ──────────────────────────────────────

def test_pipeline_publishes_hotspots_with_phase6_fields(monkeypatch):
    """Full run_city_pipeline → published hotspots carry riskTier,
    directives, EN+UR advisory, and heatIndexMean. This is the integration
    proof that Phase 6 fields survive clustering → scoring → publication."""
    from tests.test_qc import _install_mongo_stubs, _FakeObjectId
    from tests.test_phase4 import KARACHI_CENTERS
    from services.scheduled_pipeline import run_city_pipeline, current_hotspots

    holder = _install_mongo_stubs(monkeypatch)
    db = holder["get_db"]()
    # 5 verified reports in a tight Karachi cluster, each with a weather
    # snapshot carrying a dangerous heat index.
    clat, clng = KARACHI_CENTERS[0]
    for i in range(5):
        db.weathersnapshots.insert_one({
            "_id": _FakeObjectId(f"w-0-{i}"),
            "heatIndex": 46.0 + i,
        })
        db.reports.insert_one({
            "_id": _FakeObjectId(f"k-0-{i}"),
            "reportRef": f"HTX-k-0-{i}",
            "city": "Karachi",
            "status": "verified",
            "latitude": clat + i * 0.001,
            "longitude": clng + i * 0.001,
            "ambientTemp": 44.0,
            "severityLevel": 5,
            "weatherSnapshotRef": _FakeObjectId(f"w-0-{i}"),
        })

    monkeypatch.setattr("services.pop_grid.pop_density_at", lambda c, lat, lng: 25000.0)
    res = run_city_pipeline(db, "Karachi")
    assert res["status"] == "COMPLETED"
    assert res["clustersFound"] == 1

    hotspots = current_hotspots(db, "Karachi")
    assert len(hotspots) == 1
    hs = hotspots[0]

    # Phase 6 fields are present on the published document.
    assert hs["riskTier"] in ("critical", "high", "moderate", "low")
    assert isinstance(hs["directives"], list)
    assert hs["heatIndexMean"] == pytest.approx(48.0)  # mean of 46..50

    adv = hs["advisory"]
    assert adv is not None
    assert adv["en"] and adv["ur"]
    assert adv["tier"] == hs["riskTier"]
    assert adv["heatIndexBand"] == "extreme"  # mean heat index 48
    assert adv["heatIndex"] == pytest.approx(48.0)

    # Directives start with the deterministic table for this tier, then
    # context-specific additions (dense population in this seed).
    base = TIER_DIRECTIVES[hs["riskTier"]]
    assert hs["directives"][:len(base)] == base
    extra_ids = [d["id"] for d in hs["directives"][len(base):]]
    assert "dense-pop-priority" in extra_ids

    # The advisory never contains template placeholders.
    assert "{" not in adv["en"] and "}" not in adv["en"]
    assert "{" not in adv["ur"] and "}" not in adv["ur"]
