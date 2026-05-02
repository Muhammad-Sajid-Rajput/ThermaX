import { useState, useEffect, useCallback } from 'react';
import hotspotsService from '../../services/hotspotsService.js';
/**
 * Custom hook for managing hotspots data
 * @param {Object} filters - Initial filters for hotspots data
 * @returns {Object} Hotspots data state and management functions
 */
export function useHotspots(filters = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  /**
   * Load hotspots data
   * @param {Object} newFilters - Optional new filters
   */
  const loadHotspotsData = useCallback(
    async (newFilters = {}) => {
      try {
        setLoading(true);
        setError(null);
        const response = await hotspotsService.getHotspotsData({
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
   * Refresh hotspots data
   */
  const refresh = useCallback(() => {
    return loadHotspotsData();
  }, [loadHotspotsData]);
  /**
   * Update filters and reload data
   * @param {Object} newFilters - New filters to apply
   */
  const updateFilters = useCallback(
    (newFilters) => {
      return loadHotspotsData(newFilters);
    },
    [loadHotspotsData]
  );
  // Load initial data
  useEffect(() => {
    loadHotspotsData();
  }, [loadHotspotsData]);
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
 * Custom hook for hotspots statistics
 * @param {Object} filters - Filters for statistics
 * @returns {Object} Hotspots statistics state
 */
export function useHotspotsStats(filters = {}) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await hotspotsService.getHotspotsStats(filters);
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
/**
 * Custom hook for hotspot details
 * @param {string} hotspotId - Hotspot ID
 * @returns {Object} Hotspot details state
 */
export function useHotspotDetails(hotspotId) {
  const [hotspot, setHotspot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const loadHotspotDetails = useCallback(async () => {
    if (!hotspotId) {
      setHotspot(null);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await hotspotsService.getHotspotById(hotspotId);
      if (response.success) {
        setHotspot(response.data);
      } else {
        setError(response.error);
        setHotspot(null);
      }
    } catch (err) {
      setError(err.message);
      setHotspot(null);
    } finally {
      setLoading(false);
    }
  }, [hotspotId]);
  useEffect(() => {
    loadHotspotDetails();
  }, [loadHotspotDetails]);
  return {
    hotspot,
    loading,
    error,
    refresh: loadHotspotDetails,
  };
}
export default useHotspots;
