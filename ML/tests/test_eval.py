"""Phase 8: the DBSCAN sensitivity sweep is importable, deterministic, sane.

Pins the behavior of eval/sensitivity.py so CI guards the evaluation
itself: the sweep must run without crashing, be deterministic, and the
production defaults (eps=1.0 km, min_samples=3 — recalibrated in Phase 8)
must recover the synthetic truth.
"""
from eval.sensitivity import (
    DEFAULT_EPS_KM,
    DEFAULT_MIN_SAMPLES,
    EPS_VALUES,
    MIN_SAMPLES_VALUES,
    as_markdown,
    as_tsv,
    make_demo_points,
    recovered_centers,
    sweep,
)
from services.clustering_service import run_dbscan_clustering


def test_sweep_row_shape():
    points, centers = make_demo_points()
    # 2.0 is an arbitrary sweep-grid value for shape testing — NOT the
    # production default (DBSCAN_EPS_KM = 1.0 after the Phase 8 calibration).
    rows = sweep(points, centers, [2.0], [3])
    assert len(rows) == 1
    row = rows[0]
    assert set(row) == {
        "eps_km", "min_samples", "clusters", "noise",
        "largest", "recovered", "expected",
    }
    assert row["expected"] == 3
    assert row["clusters"] + 0 <= len(points)
    assert row["noise"] == len(points) - sum(
        c["reportCount"]
        for c in run_dbscan_clustering(points, eps_km=2.0, min_samples=3)
    )


def test_sweep_is_deterministic():
    points, centers = make_demo_points()
    first = sweep(points, centers, [0.5, 3.0], [2, 8])
    # Fresh points, same seed -> identical rows.
    points2, centers2 = make_demo_points()
    second = sweep(points2, centers2, [0.5, 3.0], [2, 8])
    assert first == second


def test_production_defaults_recover_all_expected_clusters():
    points, centers = make_demo_points()
    rows = sweep(points, centers, [DEFAULT_EPS_KM], [DEFAULT_MIN_SAMPLES])
    assert len(rows) == 1
    row = rows[0]
    assert row["recovered"] == row["expected"] == 3
    assert row["clusters"] == 3


def test_tiny_eps_fragments_everything_to_noise():
    # eps far below the intra-cluster spacing with a high min_samples bar:
    # no cluster can form — the sweep must report it, not crash.
    points, centers = make_demo_points()
    rows = sweep(points, centers, [0.1], [8])
    assert rows[0]["clusters"] == 0
    assert rows[0]["recovered"] == 0
    assert rows[0]["noise"] == len(points)


def test_renderers_cover_all_grid_cells():
    points, centers = make_demo_points()
    rows = sweep(points, centers)
    assert len(rows) == len(EPS_VALUES) * len(MIN_SAMPLES_VALUES)
    md = as_markdown(rows)
    data_lines = [ln for ln in md.splitlines() if ln.startswith("| ")][2:]
    assert len(data_lines) == len(rows)
    assert "production defaults" in md
    tsv = as_tsv(rows)
    assert len(tsv.splitlines()) == len(rows) + 1


def test_recovered_centers_counts_each_true_center_once():
    points, centers = make_demo_points()
    clusters = run_dbscan_clustering(
        points, eps_km=DEFAULT_EPS_KM, min_samples=DEFAULT_MIN_SAMPLES)
    assert recovered_centers(clusters, centers) == 3
    assert recovered_centers([], centers) == 0
