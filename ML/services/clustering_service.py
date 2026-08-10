import math

EARTH_RADIUS_KM = 6371.0088
DEFAULT_EPS_KM = 1.5
DEFAULT_MIN_SAMPLES = 3

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two points in km."""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return EARTH_RADIUS_KM * c

def run_dbscan_clustering(report_points: list, eps_km: float = DEFAULT_EPS_KM, min_samples: int = DEFAULT_MIN_SAMPLES) -> list:
    """
    Pure Python Spatial DBSCAN Clustering using Haversine distance (0 dependencies).
    report_points: list of dicts [{'id': '...', 'lat': 24.85, 'lng': 67.02, 'temp': 42.0}, ...]
    Returns list of discovered hotspot cluster definitions.
    """
    n = len(report_points)
    if n < min_samples:
        return []

    # Calculate pairwise Haversine distance matrix
    neighbors = [[] for _ in range(n)]
    for i in range(n):
        for j in range(i + 1, n):
            dist = haversine_distance_km(
                report_points[i]['lat'], report_points[i]['lng'],
                report_points[j]['lat'], report_points[j]['lng']
            )
            if dist <= eps_km:
                neighbors[i].append(j)
                neighbors[j].append(i)

    # DBSCAN Cluster Assignment
    visited = [False] * n
    cluster_labels = [-1] * n
    current_cluster_id = 0

    for i in range(n):
        if visited[i]:
            continue
        visited[i] = True

        if len(neighbors[i]) + 1 < min_samples:
            cluster_labels[i] = -1 # Noise
        else:
            cluster_labels[i] = current_cluster_id
            seeds = list(neighbors[i])
            s_idx = 0
            while s_idx < len(seeds):
                curr = seeds[s_idx]
                s_idx += 1
                if not visited[curr]:
                    visited[curr] = True
                    if len(neighbors[curr]) + 1 >= min_samples:
                        seeds.extend([nbr for nbr in neighbors[curr] if nbr not in seeds])
                if cluster_labels[curr] == -1:
                    cluster_labels[curr] = current_cluster_id

            current_cluster_id += 1

    # Format output clusters
    unique_clusters = set(label for label in cluster_labels if label != -1)
    clusters = []

    for label in unique_clusters:
        member_indices = [idx for idx, l in enumerate(cluster_labels) if l == label]
        cluster_members = [report_points[idx] for idx in member_indices]

        member_lats = [m['lat'] for m in cluster_members]
        member_lngs = [m['lng'] for m in cluster_members]
        member_temps = [m.get('temp', 40.0) for m in cluster_members]
        member_ids = [m['id'] for m in cluster_members]

        centroid_lat = sum(member_lats) / len(member_lats)
        centroid_lng = sum(member_lngs) / len(member_lngs)
        avg_temp = sum(member_temps) / len(member_temps)
        peak_temp = max(member_temps)

        min_lat, max_lat = min(member_lats) - 0.005, max(member_lats) + 0.005
        min_lng, max_lng = min(member_lngs) - 0.005, max(member_lngs) + 0.005

        polygon_coords = [
            [min_lng, min_lat],
            [max_lng, min_lat],
            [max_lng, max_lat],
            [min_lng, max_lat],
            [min_lng, min_lat]
        ]

        severity = 'critical' if peak_temp >= 43.0 else ('high' if peak_temp >= 40.0 else 'moderate')

        clusters.append({
            "clusterId": f"CL-{label + 1:02d}",
            "centroid": {"lat": round(centroid_lat, 4), "lng": round(centroid_lng, 4)},
            "boundary": {
                "type": "Polygon",
                "coordinates": [polygon_coords]
            },
            "avgTemp": round(avg_temp, 1),
            "peakTemp": round(peak_temp, 1),
            "reportCount": len(cluster_members),
            "memberReportIds": member_ids,
            "severity": severity,
            "status": "active"
        })

    return clusters
