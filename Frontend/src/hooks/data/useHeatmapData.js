import { useState, useEffect, useCallback } from 'react';
import useApiResource from '../api/useApiResource';
import heatmapService from '../services/heatmapService.js';
/**
 * Custom hook for managing heatmap data
 * @param {Object} filters - Initial filters for heatmap data
 * @returns {Object} Heatmap data state and management functions
 */
export function useHeatmapData(filters = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  /**
   * Load heatmap data
   * @param {Object} newFilters - Optional new filters
   */
  const loadHeatmapData = useCallback(
    async (newFilters = {}) => {
      try {
        setLoading(true);
        setError(null);
        const response = await heatmapService.getHeatmapData({
          ...filters,
          ...newFilters,
        });
        if (response.success) {
          setData(response.data);
          setLastUpdated(response.lastUpdated);
        } else {
          setError(response.error);
          setData([]);
        }
      } catch (err) {
        setError(err.message);
        setData([]);
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );
  /**
   * Refresh heatmap data
   */
  const refresh = useCallback(() => {
    return loadHeatmapData();
  }, [loadHeatmapData]);
  /**
   * Update filters and reload data
   * @param {Object} newFilters - New filters to apply
   */
  const updateFilters = useCallback(
    (newFilters) => {
      return loadHeatmapData(newFilters);
    },
    [loadHeatmapData]
  );
  // Load initial data
  useEffect(() => {
    loadHeatmapData();
  }, [loadHeatmapData]);
  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh,
    updateFilters,
    isEmpty: data.length === 0 && !loading,
  };
}
/**
 * Custom hook for heatmap statistics
 * @param {Object} filters - Filters for statistics
 * @returns {Object} Heatmap statistics state
 */
export function useHeatmapStats(filters = {}) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await heatmapService.getHeatmapStats(filters);
      if (response.success) {
        setStats(response.data);
      } else {
        setError(response.error);
        setStats(null);
      }
    } catch (err) {
      setError(err.message);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [filters]);
  useEffect(() => {
    loadStats();
  }, [loadStats]);
  return {
    stats,
    loading,
    error,
    refresh: loadStats,
  };
}
export default useHeatmapData;
