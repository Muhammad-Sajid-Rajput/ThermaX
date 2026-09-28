import { useEffect, useState, useCallback, useRef } from 'react';

function useApiResource(request, params = {}, options = {}) {
  const [reloadKey, setReloadKey] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(options.enabled !== false);
  const [error, setError] = useState(null);

  // `params` is usually an inline object literal — depending on it directly
  // would refetch every render. Serialize it: refetch only when the actual
  // filter values change. The live params are read via ref inside the effect.
  const paramsKey = JSON.stringify(params ?? {});
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const enabled = options.enabled !== false;

  const reload = useCallback(() => setReloadKey((prev) => prev + 1), []);

  useEffect(() => {
    let isActive = true;
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    request(paramsRef.current)
      .then((res) => {
        if (isActive) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isActive) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [enabled, paramsKey, reloadKey, request]);

  return { data, loading, error, reload };
}

export default useApiResource;
