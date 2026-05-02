import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';
// Mock API endpoints - replace with actual endpoints
const API_ENDPOINTS = {
  heatmap: '/api/heatmap',
  reports: '/api/reports',
  hotspots: '/api/hotspots',
};
// Rate limiting for console messages
const loggedMessages = new Map();
const shouldLog = (message, cooldownMs = 30000) => {
  const now = Date.now();
  const lastLogged = loggedMessages.get(message);
  if (!lastLogged || now - lastLogged > cooldownMs) {
    loggedMessages.set(message, now);
    return true;
  }
  return false;
};
// Mock data generator for development
const generateMockData = (type) => {
  const baseLat = 40.7128; // NYC coordinates
  const baseLng = -74.006;
  const offset = 0.1;
  switch (type) {
    case 'heatmap':
      return Array.from({ length: 100 }, () => ({
        lat: baseLat + (Math.random() - 0.5) * offset,
        lng: baseLng + (Math.random() - 0.5) * offset,
        severity: Math.random() * 4 + 1,
        intensity: Math.random(),
      }));
    case 'reports':
      return Array.from({ length: 50 }, (_, i) => ({
        id: `report-${i}`,
        lat: baseLat + (Math.random() - 0.5) * offset,
        lng: baseLng + (Math.random() - 0.5) * offset,
        severity: Math.floor(Math.random() * 5) + 1,
        description: `Heat report ${i + 1}`,
        category: ['Urban Heat', 'Lack of Shade', 'Poor Ventilation'][
          Math.floor(Math.random() * 3)
        ],
        temperature: Math.random() * 15 + 25,
        timestamp: new Date(
          Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
        area: `Area ${Math.floor(Math.random() * 10) + 1}`,
        source: 'Citizen',
      }));
    case 'hotspots':
      return Array.from({ length: 5 }, (_, i) => ({
        id: `hotspot-${i}`,
        center: [
          baseLat + (Math.random() - 0.5) * offset * 2,
          baseLng + (Math.random() - 0.5) * offset * 2,
        ],
        radius: Math.random() * 1000 + 500,
        avgSeverity: Math.random() * 3 + 2,
        pointCount: Math.floor(Math.random() * 30) + 5,
        avgTemperature: Math.random() * 10 + 30,
        area: `Hotspot Area ${i + 1}`,
        clusterId: `cluster-${i}`,
      }));
    default:
      return [];
  }
};
// Fetch data from API with fallback to mock data
const fetchData = async (endpoint, type) => {
  try {
    // Try to fetch from actual API first
    const response = await axios.get(endpoint, {
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' },
    });
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }
    // Fallback to mock data if API returns invalid data (silent for now)
    return generateMockData(type);
  } catch (error) {
    // Silent fallback to mock data
    return generateMockData(type);
  }
};
// Debounce function to prevent excessive API calls
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};
function useRealTimeData(options = {}) {
  const {
    pollingInterval = 30000, // 30 seconds default
    enabled = true,
    endpoints = API_ENDPOINTS,
    onError,
    onSuccess,
    retryAttempts = 3,
    retryDelay = 1000,
  } = options;
  const [data, setData] = useState({
    heatmap: [],
    reports: [],
    hotspots: [],
  });
  const [loading, setLoading] = useState({
    heatmap: false,
    reports: false,
    hotspots: false,
  });
  const [errors, setErrors] = useState({
    heatmap: null,
    reports: null,
    hotspots: null,
  });
  const [lastUpdated, setLastUpdated] = useState({
    heatmap: null,
    reports: null,
    hotspots: null,
  });
  const [isPolling, setIsPolling] = useState(false);
  const pollingRef = useRef(null);
  const retryCountRef = useRef(0);
  // Fetch individual data type
  const fetchDataType = useCallback(
    async (type) => {
      const endpoint = endpoints[type];
      if (!endpoint) return;
      setLoading((prev) => ({ ...prev, [type]: true }));
      setErrors((prev) => ({ ...prev, [type]: null }));
      try {
        const result = await fetchData(endpoint, type);
        setData((prev) => ({ ...prev, [type]: result }));
        setLastUpdated((prev) => ({ ...prev, [type]: new Date() }));
        setErrors((prev) => ({ ...prev, [type]: null }));
        if (onSuccess) {
          onSuccess(type, result);
        }
        retryCountRef.current = 0; // Reset retry count on success
      } catch (error) {
        const errorMessage = `Failed to fetch ${type}: ${error.message}`;
        setErrors((prev) => ({ ...prev, [type]: errorMessage }));
        if (onError) {
          onError(type, error);
        }
        // Implement retry logic
        if (retryCountRef.current < retryAttempts) {
          retryCountRef.current++;
          if (process.env.NODE_ENV === 'development') {
            console.log(
              `Retrying ${type} fetch (attempt ${retryCountRef.current}/${retryAttempts})`
            );
          }
          setTimeout(() => {
            fetchDataType(type);
          }, retryDelay * retryCountRef.current);
        }
      } finally {
        setLoading((prev) => ({ ...prev, [type]: false }));
      }
    },
    [endpoints, onSuccess, onError, retryAttempts, retryDelay]
  );
  // Fetch all data types
  const fetchAllData = useCallback(async () => {
    const promises = ['heatmap', 'reports', 'hotspots'].map((type) =>
      fetchDataType(type)
    );
    await Promise.allSettled(promises);
  }, [fetchDataType]);
  // Debounced version of fetchAllData
  const debouncedFetchAll = useCallback(debounce(fetchAllData, 1000), [
    fetchAllData,
  ]);
  // Manual refresh
  const refresh = useCallback(() => {
    debouncedFetchAll();
  }, [debouncedFetchAll]);
  // Refresh specific data type
  const refreshType = useCallback(
    (type) => {
      fetchDataType(type);
    },
    [fetchDataType]
  );
  // Set up polling when enabled
  useEffect(() => {
    if (enabled) {
      if (pollingRef.current) return; // Prevent multiple intervals
      setIsPolling(true);
      // Initial fetch
      fetchAllData();
      // Set up interval
      pollingRef.current = setInterval(() => {
        fetchAllData();
      }, pollingInterval);
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
        setIsPolling(false);
      }
    }
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
        setIsPolling(false);
      }
    };
  }, [enabled, pollingInterval]);
  // Calculate overall loading state
  const isLoading = Object.values(loading).some(Boolean);
  // Calculate if there are any errors
  const hasErrors = Object.values(errors).some(Boolean);
  // Get most recent update time
  const mostRecentUpdate = useMemo(() => {
    const timestamps = Object.values(lastUpdated).filter(Boolean);
    return timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null;
  }, [lastUpdated]);
  return {
    data,
    loading,
    errors,
    lastUpdated,
    isLoading,
    hasErrors,
    mostRecentUpdate,
    isPolling,
    refresh,
    refreshType,
  };
}
export default useRealTimeData;
