import React, { useMemo } from 'react';
import useSelectedLocation from '../../hooks/useSelectedLocation';
import useUserLocationStore from '../../stores/userLocationStore';
import useWeather from '../../hooks/data/useWeather';
import {
  X,
  MapPin,
  Thermometer,
  Droplets,
  Clock,
  TrendingUp,
  Sun,
  Wind,
} from 'lucide-react';

function resolveCoords(location) {
  if (!location) return { lat: null, lng: null };
  const lat =
    location.coordinates?.lat ??
    location.latitude ??
    location.lat ??
    null;
  const lng =
    location.coordinates?.lng ??
    location.longitude ??
    location.lng ??
    null;
  return { lat, lng };
}

export const ContextPanel = () => {
  const { selectedLocation, isPanelOpen, clearLocation } =
    useSelectedLocation();

  const userLat = useUserLocationStore((s) => s.lat);
  const userLng = useUserLocationStore((s) => s.lng);
  const geoStatus = useUserLocationStore((s) => s.status);
  const requestLocation = useUserLocationStore((s) => s.requestLocation);

  const mapCoords = useMemo(
    () => resolveCoords(selectedLocation),
    [selectedLocation]
  );

  const lat = mapCoords.lat ?? userLat;
  const lng = mapCoords.lng ?? userLng;
  const usingUserLocation = mapCoords.lat == null && userLat != null;

  const { data: weather, isLoading, isError } = useWeather(lat, lng, {
    save: false,
    enabled: isPanelOpen && lat != null && lng != null,
  });

  const temperature =
    weather?.temperature ?? selectedLocation?.temperature ?? '—';
  const humidity = weather?.humidity ?? selectedLocation?.humidity ?? '—';
  const heatIndex = weather?.heatIndex;
  const uv = weather?.uv;
  const condition = weather?.condition;
  const windKph = weather?.windKph;

  if (!isPanelOpen) return null;

  return (
    <div className="bg-white h-full flex flex-col">
      <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
        <h3 className="text-base font-bold text-slate-900 tracking-tight">
          Location Context
        </h3>
        {selectedLocation && (
          <button
            onClick={clearLocation}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="p-6 overflow-y-auto flex-1">
        {selectedLocation ? (
          <div className="space-y-6">
            <div className="flex gap-3">
              <div className="mt-1">
                <MapPin className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 leading-tight">
                  {weather?.location ?? selectedLocation.name}
                </h4>
                <p className="text-sm text-slate-500 mt-1 leading-snug">
                  {selectedLocation.address ?? condition ?? 'Live conditions'}
                </p>
                {weather?.cached && (
                  <p className="text-xs text-slate-400 mt-1">Cached reading</p>
                )}
              </div>
            </div>

            {usingUserLocation && (
              <p className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                Weather at your current location
              </p>
            )}

            {geoStatus === 'loading' && lat == null && (
              <p className="text-sm text-slate-500">Detecting your location…</p>
            )}

            {(geoStatus === 'denied' || geoStatus === 'unsupported') &&
              lat == null && (
                <div className="text-sm text-amber-700 space-y-2">
                  <p>Enable location access to see live weather here.</p>
                  <button
                    type="button"
                    onClick={() => requestLocation({ force: true })}
                    className="font-medium text-green-700 hover:underline"
                  >
                    Use my location
                  </button>
                </div>
              )}

            {isLoading && lat != null && (
              <p className="text-sm text-slate-500">Loading live weather…</p>
            )}
            {isError && (
              <p className="text-sm text-amber-700">
                Live weather unavailable. Showing last known values.
              </p>
            )}

            {weather?.alerts?.extremeHeat && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {weather.alerts.message}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col gap-1 transition-colors hover:bg-slate-100">
                <div className="flex items-center gap-1.5 text-sm text-slate-500 font-medium">
                  <Thermometer className="w-4 h-4 text-orange-500" /> Temp
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {temperature}°C
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col gap-1 transition-colors hover:bg-slate-100">
                <div className="flex items-center gap-1.5 text-sm text-slate-500 font-medium">
                  <Droplets className="w-4 h-4 text-green-500" /> Humidity
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {humidity}%
                </div>
              </div>
              {heatIndex != null && (
                <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-sm text-orange-700 font-medium">
                    <Thermometer className="w-4 h-4" /> Heat index
                  </div>
                  <div className="text-2xl font-bold text-orange-900">
                    {heatIndex}°C
                  </div>
                </div>
              )}
              {uv != null && (
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-sm text-amber-700 font-medium">
                    <Sun className="w-4 h-4" /> UV
                  </div>
                  <div className="text-2xl font-bold text-amber-900">{uv}</div>
                </div>
              )}
            </div>

            {(condition || windKph != null) && (
              <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                {condition && (
                  <span className="rounded-full bg-slate-100 px-3 py-1">
                    {condition}
                  </span>
                )}
                {windKph != null && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                    <Wind className="w-3.5 h-3.5" />
                    {windKph} km/h
                  </span>
                )}
              </div>
            )}

            <div className="pt-6 border-t border-slate-100 space-y-4">
              <h5 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" /> Conditions
              </h5>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-sm text-slate-500">Feels like</span>
                  <span className="font-semibold text-slate-900">
                    {weather?.feelsLike != null
                      ? `${weather.feelsLike}°C`
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-sm text-slate-500">Heat index</span>
                  <span className="font-semibold text-red-600 flex items-center gap-1">
                    {heatIndex != null ? `${heatIndex}°C` : '—'}
                    {heatIndex != null && <TrendingUp className="w-3 h-3" />}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : lat != null && lng != null ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Click the map for a specific area, or view weather at your current
              location below.
            </p>
            {isLoading && (
              <p className="text-sm text-slate-500">Loading live weather…</p>
            )}
            {weather && (
              <>
                <h4 className="font-semibold text-slate-900">{weather.location}</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                    <p className="text-sm text-slate-500">Temperature</p>
                    <p className="text-2xl font-bold">{weather.temperature}°C</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                    <p className="text-sm text-slate-500">Humidity</p>
                    <p className="text-2xl font-bold">{weather.humidity}%</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600">{weather.condition}</p>
              </>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center pb-12">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <MapPin className="w-8 h-8 text-slate-300" />
            </div>
            <h4 className="text-base font-semibold text-slate-900 mb-1">
              No Location Selected
            </h4>
            <p className="text-sm text-slate-500 max-w-50">
              Allow location access or click the map to view environmental
              context.
            </p>
            {(geoStatus === 'denied' || geoStatus === 'unsupported') && (
              <button
                type="button"
                onClick={() => requestLocation({ force: true })}
                className="mt-4 text-sm font-medium text-green-700 hover:underline"
              >
                Use my location
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContextPanel;
