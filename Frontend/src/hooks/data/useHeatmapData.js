import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchHeatmap } from '../../services/api.js';

/**
 * `filters` defaults to `{}` — a fresh object every render. Depending on it
 * directly (e.g. `useCallback(..., [filters])`) would change the callback
 * identity every render and re-fire the fetch effect in a loop. Instead the
 * effect keys on the serialized filters and the loader reads them via ref.
 */
function useFiltersRef(filters) {
  const key = JSON.stringify(filters ?? {});
  const ref = useRef(filters);
  ref.current = filters;
  return { key, ref };
}

export function useHeatmapData(filters = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const { key: filtersKey, ref: filtersRef } = useFiltersRef(filters);

  const loadHeatmapData = useCallback(
    async (newFilters = {}) => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetchHeatmap({ ...filtersRef.current, ...newFilters });
        setData(response.data || []);
        setLastUpdated(response.lastUpdated);
      } catch (err) {
        setError(err.message);
        setData([]);
      } finally {
        setLoading(false);
      }
    },
    [filtersRef]
  );

  const refresh = useCallback(() => loadHeatmapData(), [loadHeatmapData]);
  const updateFilters = useCallback((newFilters) => loadHeatmapData(newFilters), [loadHeatmapData]);

  useEffect(() => {
    loadHeatmapData();
  }, [loadHeatmapData, filtersKey]);

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
  const { key: filtersKey, ref: filtersRef } = useFiltersRef(filters);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchHeatmap(filtersRef.current);
      const points = response.heatmap || response.data || [];
      const intensities = points.map((p) => p.intensity ?? 0);
      setStats({
        totalPoints: points.length,
        avgIntensity: points.length > 0 ? intensities.reduce((sum, val) => sum + val, 0) / points.length : 0,
        maxIntensity: points.length > 0 ? Math.max(...intensities) : 0,
        minIntensity: points.length > 0 ? Math.min(...intensities) : 0,
      });
    } catch (err) {
      setError(err.message);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [filtersRef]);

  useEffect(() => {
    loadStats();
  }, [loadStats, filtersKey]);

  return { stats, loading, error, refresh: loadStats };
}

export default useHeatmapData;
