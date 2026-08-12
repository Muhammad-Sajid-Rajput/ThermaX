import { useState, useEffect, useCallback } from 'react';
import { fetchHotspots } from '../../services/api.js';

export function useHotspots(filters = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadHotspots = useCallback(
    async (newFilters = {}) => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetchHotspots({ ...filters, ...newFilters });
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

  const refresh = useCallback(() => loadHotspots(), [loadHotspots]);
  const updateFilters = useCallback((newFilters) => loadHotspots(newFilters), [loadHotspots]);

  useEffect(() => {
    loadHotspots();
  }, [loadHotspots]);

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

export function useHotspotsStats(filters = {}) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchHotspots(filters);
      const items = response.data || [];
      setStats({
        totalHotspots: items.length,
        criticalCount: items.filter((h) => h.priority === 'Critical').length,
        highCount: items.filter((h) => h.priority === 'High').length,
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

export default useHotspots;
