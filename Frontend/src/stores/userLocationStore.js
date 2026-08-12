import { create } from 'zustand';

const useUserLocationStore = create((set, get) => ({
  lat: null,
  lng: null,
  cityName: null,
  accuracy: null,
  status: 'idle',
  error: null,
  requested: false,

  requestLocation: (options = {}) => {
    const { force = false } = options;
    const state = get();

    if (!force && state.requested && state.status !== 'idle') {
      return Promise.resolve(
        state.status === 'ready'
          ? { lat: state.lat, lng: state.lng, cityName: state.cityName }
          : null
      );
    }

    if (!navigator.geolocation) {
      set({
        status: 'unsupported',
        error: 'Geolocation is not supported by your browser',
        requested: true,
      });
      return Promise.resolve(null);
    }

    set({ status: 'loading', error: null, requested: true });

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          let cityName = null;
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`,
              { headers: { 'User-Agent': 'ThermaX-App' } }
            );
            const data = await res.json();
            cityName =
              data.address?.city ||
              data.address?.town ||
              data.address?.county ||
              data.address?.state_district ||
              data.address?.state ||
              'Your City';
          } catch {
            cityName = 'Your City';
          }

          set({
            lat: latitude,
            lng: longitude,
            cityName,
            accuracy,
            status: 'ready',
            error: null,
          });
          resolve({ lat: latitude, lng: longitude, cityName });
        },
        (err) => {
          const message =
            err.code === 1
              ? 'Location permission denied'
              : err.code === 2
                ? 'Location unavailable'
                : err.message || 'Failed to get location';
          set({
            status: 'denied',
            error: message,
          });
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 5 * 60 * 1000,
        }
      );
    });
  },

  clearLocation: () =>
    set({
      lat: null,
      lng: null,
      cityName: null,
      accuracy: null,
      status: 'idle',
      error: null,
      requested: false,
    }),
}));

export default useUserLocationStore;
