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

  // (0,0) "Null Island" is never a real user location — treat it as
  // unresolved so no weather call fires for it (see useWeather).
  const hasCoords =
    lat != null && lon != null && !(Number(lat) === 0 && Number(lon) === 0);
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
