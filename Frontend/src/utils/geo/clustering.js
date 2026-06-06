import { DBSCAN } from 'density-clustering';
import { scoreClusterByHeatIndex } from './weatherUtils.js';

/**
 * Perform DBSCAN clustering on geographic points.
 *
 * @param {Array} points - Array of objects containing { lat, lng, temp, severity }
 * @param {number} eps - Search radius (e.g., 0.01 degrees)
 * @param {number} minPts - Minimum points to form a cluster
 * @returns {Array} Array of raw clusters, where each cluster is an array of point indices
 */
export const runDbscan = (points, eps = 0.01, minPts = 3) => {
  if (!points || points.length === 0) return [];

  // density-clustering requires an array of arrays representing the dataset
  // e.g., [[lng, lat], [lng, lat], ...]
  const dataset = points.map((p) => [p.lng, p.lat]);

  const dbscan = new DBSCAN();

  // Calculate clusters
  // Note: dbscan.run takes (dataset, eps, minPts)
  const clusters = dbscan.run(dataset, eps, minPts);

  return clusters;
};

export { scoreClusterByHeatIndex };
