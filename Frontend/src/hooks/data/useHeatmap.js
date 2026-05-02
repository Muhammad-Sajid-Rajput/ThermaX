import { useEffect, useState } from 'react';
import { fetchHeatmap } from '../../services/api';
/**
 * Thin wrapper around fetchHeatmap using the same pattern as useHotspots/useReports.
 * Returns { data, loading, error, reload }.
 */
const useHeatmap = (params = {}) => {
  const [state, setState] = useState({
    data: null,
    loading: true,
    error: null,
  });
  const load = () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    fetchHeatmap(params)
      .then((data) => {
        setState({ data, loading: false, error: null });
      })
      .catch((err) => {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err.message || 'Failed to load heatmap data',
        }));
      });
  };
  useEffect(() => {
    load();
  }, [JSON.stringify(params)]);
  return { ...state, reload: load };
};
export default useHeatmap;
