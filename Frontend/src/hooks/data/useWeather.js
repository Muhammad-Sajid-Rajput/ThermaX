import { useQuery } from '@tanstack/react-query';
import { fetchCurrentWeather } from '../../services/weatherService';

/** @param lon - longitude */
export default function useWeather(lat, lon, { save = false, enabled = true } = {}) {
  const latNum = Number(lat);
  const lonNum = Number(lon);
  const hasCoords =
    lat != null &&
    lon != null &&
    !Number.isNaN(latNum) &&
    !Number.isNaN(lonNum) &&
    // (0,0) "Null Island" is never a real user location — it means
    // geolocation hasn't resolved yet. Don't fire a weather call for it.
    !(latNum === 0 && lonNum === 0);

  return useQuery({
    queryKey: ['weather', latNum, lonNum, save],
    queryFn: () => fetchCurrentWeather(latNum, lonNum, { save }),
    enabled: enabled && hasCoords,
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      const status = error?.response?.status;
      if (status === 400 || status === 503) return false;
      return failureCount < 1;
    },
  });
}
