import { useEffect } from 'react';
import useUserLocationStore from '../../stores/userLocationStore';
import useWeather from './useWeather';
import { getWeatherErrorMessage } from '../../services/weatherService';

/**
 * Geolocation + /api/weather/current for the user's position.
 * Requests browser location on mount when autoLocate is true.
 */
export default function useLocationWeather({
  autoLocate = true,
  save = false,
  enabled = true,
} = {}) {
  const lat = useUserLocationStore((s) => s.lat);
  const lon = useUserLocationStore((s) => s.lng);
  const geoStatus = useUserLocationStore((s) => s.status);
  const geoError = useUserLocationStore((s) => s.error);
  const requestLocation = useUserLocationStore((s) => s.requestLocation);

  useEffect(() => {
    if (autoLocate) {
      requestLocation();
    }
  }, [autoLocate, requestLocation]);

  const hasCoords = lat != null && lon != null;
  const weatherQuery = useWeather(lat, lon, {
    save,
    enabled: enabled && hasCoords,
  });

  const locationError =
    geoStatus === 'denied' || geoStatus === 'unsupported' ? geoError : null;

  const weatherError = weatherQuery.isError
    ? getWeatherErrorMessage(weatherQuery.error)
    : null;

  return {
    lat,
    lon,
    geoStatus,
    locationError,
    weather: weatherQuery.data,
    isLocating: geoStatus === 'loading' || geoStatus === 'idle',
    isLoadingWeather: weatherQuery.isLoading,
    weatherError,
    isReady: hasCoords && Boolean(weatherQuery.data),
    requestLocation,
    refetchWeather: weatherQuery.refetch,
  };
}
