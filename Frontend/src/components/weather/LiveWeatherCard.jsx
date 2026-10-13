import { useState } from 'react';
import {
  Navigation,
  Thermometer,
  Droplets,
  Wind,
  AlertTriangle,
  CloudOff,
  MapPinOff,
  Lock,
  RefreshCw,
  X,
  MapPin,
  Check,
} from 'lucide-react';
import useLocationWeather from '../../hooks/data/useLocationWeather';
import useUserLocationStore from '../../stores/userLocationStore';
import { toast } from 'react-hot-toast';

const QUICK_CITIES = [
  { name: 'Hyderabad (Jamshoro / Kotri)', lat: 25.405, lng: 68.261 },
  { name: 'Karachi', lat: 24.8607, lng: 67.0011 },
  { name: 'Lahore', lat: 31.5204, lng: 74.3587 },
  { name: 'Islamabad / Rawalpindi', lat: 33.6844, lng: 73.0479 },
  { name: 'Faisalabad', lat: 31.42, lng: 73.08 },
  { name: 'Multan', lat: 30.16, lng: 71.52 },
  { name: 'Peshawar', lat: 34.01, lng: 71.58 },
  { name: 'Quetta', lat: 30.18, lng: 67.0 },
];

export default function LiveWeatherCard({ className = '' }) {
  const [showLocationModal, setShowLocationModal] = useState(false);
  const setManualLocation = useUserLocationStore((s) => s.setManualLocation);
  const geoStatus = useUserLocationStore((s) => s.status);

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

  const handleSelectCity = (city) => {
    setManualLocation(city.lat, city.lng, city.name);
    setShowLocationModal(false);
    toast.success(`Location set to ${city.name}`);
    setTimeout(() => refetchWeather(), 100);
  };

  const handleTryGps = async () => {
    const res = await requestLocation({ force: true });
    if (res?.lat && res?.lng) {
      setShowLocationModal(false);
      toast.success('Location detected via GPS!');
      refetchWeather();
    } else {
      toast.error('Location still blocked. Please allow location via the 🔒 icon in your browser address bar.');
    }
  };

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}
      role="region"
      aria-label="Live weather at your location"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Real-time conditions
            </p>
            {hasCoords && (
              <button
                type="button"
                onClick={() => setShowLocationModal(true)}
                className="text-[11px] font-medium text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
              >
                Change city
              </button>
            )}
          </div>
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
          onClick={() => {
            if (geoStatus === 'denied') {
              setShowLocationModal(true);
            } else {
              requestLocation({ force: true }).then((res) => {
                if (res?.lat) refetchWeather();
                else setShowLocationModal(true);
              });
            }
          }}
          className="shrink-0 p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
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
          <div className="flex-1">
            <p className="font-medium">Location unavailable</p>
            <p className="mt-0.5 text-xs text-amber-700 leading-relaxed">
              Browser permission was blocked or dismissed.
            </p>
            <div className="mt-2.5 flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setShowLocationModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 shadow-xs cursor-pointer transition-colors"
              >
                <MapPin className="w-3.5 h-3.5" />
                Select City / Enable GPS
              </button>
            </div>
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

      {/* Location Help & City Selection Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-scale-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Choose Your Location</h3>
                  <p className="text-xs text-slate-500">Pick a city or enable device GPS</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLocationModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick City Selection */}
            <div className="mt-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                1. Select City Directly (No GPS Needed)
              </p>
              <p className="text-xs text-slate-600 mb-3">
                Click any city to load its real-time weather and heat advisories immediately:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_CITIES.map((c) => {
                  const isCurrent = (weather?.location || '').toLowerCase().includes(c.name.split(' ')[0].toLowerCase());
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => handleSelectCity(c)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                        isCurrent
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-2xs'
                          : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/40 hover:text-emerald-900'
                      }`}
                    >
                      <span className="truncate">{c.name}</span>
                      {isCurrent && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Browser Permission Guide */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                2. Why Didn't the Permission Popup Show?
              </p>
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-amber-900">
                  <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Browser Blocked Further Popups</span>
                </div>
                <p className="text-amber-800 leading-relaxed text-[11px]">
                  When location access is dismissed or blocked once, modern browsers (Chrome, Edge, Safari) deliberately prevent websites from popping up the dialog again automatically.
                </p>
                <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200/80 space-y-1.5 text-[11px]">
                  <p className="font-semibold text-slate-900">How to allow it in 10 seconds:</p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-700">
                    <li>Look at your <strong>browser URL address bar</strong> at the top.</li>
                    <li>Click the <strong>🔒 Lock icon</strong> (or tune/settings icon) next to <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">therma-x.vercel.app</code>.</li>
                    <li>Toggle <strong>Location</strong> to <strong>Allow</strong> (or click <em>Reset permissions</em>).</li>
                  </ol>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowLocationModal(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleTryGps}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Try Browser GPS Again
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
