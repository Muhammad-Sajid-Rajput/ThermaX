import { useEffect, useState, useCallback } from 'react';

function useApiResource(request, params = {}, options = {}) {
  const [reloadKey, setReloadKey] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(options.enabled !== false);
  const [error, setError] = useState(null);

  const reload = useCallback(() => setReloadKey((prev) => prev + 1), []);

  useEffect(() => {
    let isActive = true;
    if (options.enabled === false) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    request(params)
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
  }, [options.enabled, reloadKey, request]);

  return { data, loading, error, reload };
}

export default useApiResource;

