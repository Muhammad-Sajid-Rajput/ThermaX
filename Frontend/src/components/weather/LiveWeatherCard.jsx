import {
  Navigation,
  Thermometer,
  Droplets,
  Wind,
  AlertTriangle,
  CloudOff,
  MapPinOff,
} from 'lucide-react';
import useLocationWeather from '../../hooks/data/useLocationWeather';

export default function LiveWeatherCard({ className = '' }) {
  const {
    lat,
    lon,
    weather,
    isLocating,
    isLoadingWeather,
    locationError,
    weatherError,
    requestLocation,
    refetchWeather,
  } = useLocationWeather({ autoLocate: true });

  const hasCoords = lat != null && lon != null;

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}
      role="region"
      aria-label="Live weather at your location"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Real-time conditions
          </p>
          <h3 className="text-base font-bold text-slate-900 mt-0.5">
            {weather?.location ?? (hasCoords ? 'Loading area…' : 'Your location')}
          </h3>
          {hasCoords && (
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {Number(lat).toFixed(4)}, {Number(lon).toFixed(4)}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() =>
            requestLocation({ force: true }).then(() => refetchWeather())
          }
          className="shrink-0 p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
          title="Refresh location and weather"
        >
          <Navigation className="w-4 h-4" />
        </button>
      </div>

      {isLocating && !hasCoords && (
        <p className="mt-3 text-sm text-slate-500 flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-green-500/30 border-t-green-600 rounded-full animate-spin" />
          Detecting your location…
        </p>
      )}

      {locationError && !hasCoords && (
        <div className="mt-3 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <MapPinOff className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Location unavailable</p>
            <p className="mt-0.5">{locationError}</p>
            <button
              type="button"
              onClick={() => requestLocation({ force: true })}
              className="mt-2 font-medium text-green-700 hover:underline"
            >
              Enable location
            </button>
          </div>
        </div>
      )}

      {hasCoords && isLoadingWeather && (
        <p className="mt-3 text-sm text-slate-500">Loading weather from ThermaX API…</p>
      )}

      {weatherError && (
        <div className="mt-3 flex gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <CloudOff className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Weather unavailable</p>
            <p className="mt-0.5">{weatherError}</p>
          </div>
        </div>
      )}

      {hasCoords && !isLoadingWeather && weather && !weatherError && (
        <div className="mt-4 space-y-3">
          {weather.alerts?.extremeHeat && (
            <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {weather.alerts.message}
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-lg bg-orange-50 px-3 py-2">
              <div className="flex items-center gap-1 text-xs text-orange-700">
                <Thermometer className="w-3.5 h-3.5" /> Temperature
              </div>
              <p className="text-lg font-bold text-orange-900">
                {weather.temperature}°C
              </p>
            </div>
            <div className="rounded-lg bg-green-50 px-3 py-2">
              <div className="flex items-center gap-1 text-xs text-green-700">
                <Droplets className="w-3.5 h-3.5" /> Humidity
              </div>
              <p className="text-lg font-bold text-green-900">
                {weather.humidity}%
              </p>
            </div>
            <div className="rounded-lg bg-sky-50 px-3 py-2">
              <div className="flex items-center gap-1 text-xs text-sky-700">
                <Wind className="w-3.5 h-3.5" /> Wind
              </div>
              <p className="text-lg font-bold text-sky-900">
                {weather.windKph} km/h
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2 sm:col-span-1 col-span-2">
              <p className="text-xs text-slate-500">Condition</p>
              <p className="text-sm font-semibold text-slate-900 leading-snug">
                {weather.condition}
              </p>
            </div>
          </div>
          {weather.heatIndex != null &&
            weather.heatIndex !== weather.temperature && (
              <p className="text-xs text-slate-500">
                Heat index {weather.heatIndex}°C · UV {weather.uv ?? '—'}
                {weather.cached ? ' · cached' : ''}
              </p>
            )}
        </div>
      )}
    </div>
  );
}
