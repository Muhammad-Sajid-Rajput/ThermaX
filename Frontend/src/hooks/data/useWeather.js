import { useQuery } from '@tanstack/react-query';
import { fetchCurrentWeather } from '../../services/weatherService';

/** @param lon - longitude */
export default function useWeather(lat, lon, { save = false, enabled = true } = {}) {
  const hasCoords =
    lat != null &&
    lon != null &&
    !Number.isNaN(Number(lat)) &&
    !Number.isNaN(Number(lon));

  return useQuery({
    queryKey: ['weather', Number(lat), Number(lon), save],
    queryFn: () => fetchCurrentWeather(Number(lat), Number(lon), { save }),
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
