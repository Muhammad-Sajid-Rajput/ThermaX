import { useEffect, useState } from 'react';
import { fetchHeatmap } from '../../services/api';
/**
 * Thin wrapper around fetchHeatmap using the same pattern as useHotspots/useReports.
 * Returns { data, loading, error, reload }.
 *
 * `params` is usually an inline object literal — the effect keys on its
 * serialization so identical filter values don't refetch in a loop.
 */
const useHeatmap = (params = {}) => {
  const [state, setState] = useState({
    data: null,
    loading: true,
    error: null,
  });
  const paramsKey = JSON.stringify(params ?? {});
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
    // `load` is intentionally not in deps: it closes over `params`, and the
    // serialized `paramsKey` is the stable signal for "filters changed".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);
  return { ...state, reload: load };
};
export default useHeatmap;
