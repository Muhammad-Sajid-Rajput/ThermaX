"""Phase 0 tests for geographic DBSCAN clustering."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from services.clustering_service import (
    haversine_distance_km,
    run_dbscan_clustering,
)
from config import DBSCAN_EPS_KM, DBSCAN_MIN_SAMPLES


def test_haversine_known_distance():
    # One degree of latitude is ~111.19 km.
    d = haversine_distance_km(24.8607, 67.0011, 25.8607, 67.0011)
    assert abs(d - 111.19) < 0.5


def test_haversine_zero_for_same_point():
    assert haversine_distance_km(24.86, 67.0, 24.86, 67.0) == 0.0


def test_dbscan_finds_one_cluster_and_ignores_distant_point():
    points = [
        {"id": "r1", "lat": 24.8607, "lng": 67.0011, "temp": 42.0},
        {"id": "r2", "lat": 24.8610, "lng": 67.0015, "temp": 43.5},
        {"id": "r3", "lat": 24.8609, "lng": 67.0013, "temp": 41.0},
        # Lahore: hundreds of km away, must stay out of the Karachi cluster.
        {"id": "r4", "lat": 31.5204, "lng": 74.3587, "temp": 41.0},
    ]
    clusters = run_dbscan_clustering(
        points, eps_km=DBSCAN_EPS_KM, min_samples=DBSCAN_MIN_SAMPLES
    )
    assert len(clusters) == 1
    cluster = clusters[0]
    assert cluster["reportCount"] == 3
    assert set(cluster["memberReportIds"]) == {"r1", "r2", "r3"}
    assert cluster["peakTemp"] == 43.5
    assert cluster["severity"] == "critical"  # peak >= 43.0


def test_dbscan_returns_empty_when_too_few_points():
    points = [{"id": "r1", "lat": 24.86, "lng": 67.0, "temp": 42.0}]
    assert run_dbscan_clustering(points) == []
