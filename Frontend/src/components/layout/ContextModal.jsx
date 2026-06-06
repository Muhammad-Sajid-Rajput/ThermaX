import React, { useMemo } from 'react';
import useSelectedLocation from '../../hooks/useSelectedLocation';
import useUserLocationStore from '../../stores/userLocationStore';
import useWeather from '../../hooks/data/useWeather';

function resolveCoords(location) {
  if (!location) return { lat: null, lng: null };
  return {
    lat:
      location.coordinates?.lat ??
      location.latitude ??
      location.lat ??
      null,
    lng:
      location.coordinates?.lng ??
      location.longitude ??
      location.lng ??
      null,
  };
}

export const ContextModal = () => {
  const { selectedLocation, isModalOpen, closeModal } = useSelectedLocation();
  const userLat = useUserLocationStore((s) => s.lat);
  const userLng = useUserLocationStore((s) => s.lng);
  const mapCoords = useMemo(
    () => resolveCoords(selectedLocation),
    [selectedLocation]
  );
  const lat = mapCoords.lat ?? userLat;
  const lng = mapCoords.lng ?? userLng;
  const { data: weather, isLoading } = useWeather(lat, lng, {
    save: false,
    enabled: isModalOpen && lat != null && lng != null,
  });

  if (!isModalOpen || !selectedLocation) return null;

  const temperature = weather?.temperature ?? selectedLocation.temperature;
  const humidity = weather?.humidity ?? selectedLocation.humidity;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-screen overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">
              {weather?.location ?? selectedLocation.name}
            </h2>
            <button
              onClick={closeModal}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
          <p className="text-gray-600 mt-1">
            {selectedLocation.address ?? weather?.condition}
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Current Conditions
              </h3>
              {isLoading && (
                <p className="text-sm text-gray-500">Loading live weather…</p>
              )}
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                  <span className="text-green-700 font-medium">Temperature</span>
                  <span className="text-xl font-bold text-green-900">
                    {temperature}°C
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                  <span className="text-green-700 font-medium">Humidity</span>
                  <span className="text-xl font-bold text-green-900">
                    {humidity}%
                  </span>
                </div>
                {weather?.heatIndex != null && (
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded">
                    <span className="text-orange-700 font-medium">Heat index</span>
                    <span className="text-xl font-bold text-orange-900">
                      {weather.heatIndex}°C
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Live readings
              </h3>
              <div className="bg-gray-50 p-4 rounded">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Feels like</span>
                    <span className="font-medium">
                      {weather?.feelsLike != null
                        ? `${weather.feelsLike}°C`
                        : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">UV</span>
                    <span className="font-medium">{weather?.uv ?? '—'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Wind</span>
                    <span className="font-medium">
                      {weather?.windKph != null
                        ? `${weather.windKph} km/h`
                        : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {weather?.alerts?.extremeHeat && (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {weather.alerts.message}
            </div>
          )}
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={closeModal}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContextModal;
