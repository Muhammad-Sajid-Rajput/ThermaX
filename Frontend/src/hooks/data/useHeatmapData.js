import { useState, useEffect, useCallback } from 'react';
import { fetchHeatmap } from '../../services/api.js';

export function useHeatmapData(filters = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadHeatmapData = useCallback(
    async (newFilters = {}) => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetchHeatmap({ ...filters, ...newFilters });
        setData(response.data || []);
        setLastUpdated(response.lastUpdated);
      } catch (err) {
        setError(err.message);
        setData([]);
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  const refresh = useCallback(() => loadHeatmapData(), [loadHeatmapData]);
  const updateFilters = useCallback((newFilters) => loadHeatmapData(newFilters), [loadHeatmapData]);

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

export function useHeatmapStats(filters = {}) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchHeatmap(filters);
      const points = response.data || [];
      setStats({
        totalPoints: points.length,
        avgIntensity: points.reduce((sum, p) => sum + (p.intensity || 0), 0) / (points.length || 1),
        maxIntensity: Math.max(...points.map((p) => p.intensity || 0), 0),
        minIntensity: Math.min(...points.map((p) => p.intensity || 0), 1),
      });
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

  return { stats, loading, error, refresh: loadStats };
}

export default useHeatmapData;
