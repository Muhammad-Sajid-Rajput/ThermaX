import { useEffect } from 'react';
import useUserLocationStore from '../../stores/userLocationStore';

/**
 * Requests browser geolocation once per app session for weather and map defaults.
 */
export default function UserLocationInit() {
  const requestLocation = useUserLocationStore((s) => s.requestLocation);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  return null;
}
