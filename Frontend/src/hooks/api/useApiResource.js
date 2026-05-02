import { useEffect, useMemo, useState } from 'react';
function useApiResource(request, params = {}, options = {}) {
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState({
    data: null,
    loading: true,
    error: null,
  });
  const serializedParams = useMemo(() => JSON.stringify(params), [params]);
  const stableParams = useMemo(
    () => JSON.parse(serializedParams),
    [serializedParams]
  );
  useEffect(() => {
    let isActive = true;
    if (options.enabled === false) {
      setState({ data: null, loading: false, error: null });
      return undefined;
    }
    setState((current) => ({
      data: current.data,
      loading: true,
      error: null,
    }));
    request(stableParams)
      .then((data) => {
        if (!isActive) {
          return;
        }
        setState({
          data,
          loading: false,
          error: null,
        });
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }
        setState({
          data: null,
          loading: false,
          error,
        });
      });
    return () => {
      isActive = false;
    };
  }, [options.enabled, reloadKey, request, stableParams]);
  return {
    ...state,
    reload: () => setReloadKey((current) => current + 1),
  };
}
export default useApiResource;
