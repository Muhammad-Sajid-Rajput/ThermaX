import { useState, useEffect } from 'react';
import { TriangleAlert, X, Languages } from 'lucide-react';
import { fetchHotspots } from '../../services/api.js';
import useUserLocationStore from '../../stores/userLocationStore.js';
import { normalizeCity, highestTier } from '../../utils/city.js';

/**
 * Phase 6 citizen advisory banner.
 *
 * Shows the bilingual (EN/UR) heat advisory for the highest-risk hotspot in
 * the user's city, only when that hotspot's riskTier is high or critical.
 * The advisory text comes from the API's deterministic templates — this
 * component never invents guidance. When the city can't be determined, or
 * no high/critical advisory exists, it renders nothing (honest, not empty).
 */
const TIER_STYLES = {
  critical: {
    container: 'border-red-300 bg-red-50',
    icon: 'text-red-600',
    badge: 'bg-red-600 text-white',
    label: 'Critical heat risk',
  },
  high: {
    container: 'border-orange-300 bg-orange-50',
    icon: 'text-orange-600',
    badge: 'bg-orange-500 text-white',
    label: 'High heat risk',
  },
};

export default function AdvisoryBanner({ city: cityProp }) {
  const [advisory, setAdvisory] = useState(null);
  const [tier, setTier] = useState(null);
  const [areaLabel, setAreaLabel] = useState('');
  const [lang, setLang] = useState('en');
  const [dismissed, setDismissed] = useState(false);
  const [city, setCity] = useState(cityProp || null);
  const requestLocation = useUserLocationStore((s) => s.requestLocation);
  const storedCityName = useUserLocationStore((s) => s.cityName);

  // Resolve the city: explicit prop wins, otherwise reverse-geocoded location.
  useEffect(() => {
    if (cityProp) {
      setCity(normalizeCity(cityProp));
      return;
    }
    if (storedCityName) {
      setCity(normalizeCity(storedCityName));
      return;
    }
    let cancelled = false;
    requestLocation().then((loc) => {
      if (!cancelled && loc?.cityName) setCity(normalizeCity(loc.cityName));
    });
    return () => {
      cancelled = true;
    };
  }, [cityProp, storedCityName, requestLocation]);

  // Load the city's hotspots and pick the highest-tier advisory.
  useEffect(() => {
    if (!city) return;
    let cancelled = false;
    fetchHotspots({ city })
      .then((res) => {
        if (cancelled) return;
        const top = highestTier(res.data || []);
        if (top && (top.riskTier === 'high' || top.riskTier === 'critical') && (top.advisory?.en || top.advisory?.ur)) {
          setAdvisory(top.advisory);
          setTier(top.riskTier);
          setAreaLabel(top.area || top.city || city);
        }
      })
      .catch(() => {
        // Advisory is best-effort: a failed fetch hides the banner, never a fake one.
      });
    return () => {
      cancelled = true;
    };
  }, [city]);

  if (dismissed || !advisory || !tier || !TIER_STYLES[tier]) return null;
  const styles = TIER_STYLES[tier];
  // A missing translation falls back to the available language — the
  // banner must never render blank text for a language the API didn't send.
  const text =
    lang === 'ur' ? (advisory.ur ?? advisory.en) : (advisory.en ?? advisory.ur);

  return (
    <div
      role="alert"
      dir={lang === 'ur' ? 'rtl' : 'ltr'}
      className={`rounded-xl border p-4 shadow-sm ${styles.container}`}
    >
      <div className="flex items-start gap-3">
        <TriangleAlert className={`w-5 h-5 mt-0.5 shrink-0 ${styles.icon}`} aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${styles.badge}`}>
              {styles.label}
            </span>
            <span className="text-[11px] font-medium text-slate-600">{areaLabel}</span>
          </div>
          <p className={`text-sm text-slate-800 leading-relaxed ${lang === 'ur' ? 'font-[Noto_Nastaliq_Urdu,serif]' : ''}`}>
            {text}
          </p>
          {advisory.heatIndex != null && (
            <p className="text-[11px] text-slate-500 mt-1">
              Heat index: {advisory.heatIndex}°C
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setLang((l) => (l === 'en' ? 'ur' : 'en'))}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-white/60 transition-colors"
            title={lang === 'en' ? 'اردو میں دیکھیں' : 'View in English'}
            aria-label={lang === 'en' ? 'Switch to Urdu' : 'Switch to English'}
          >
            <Languages className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-white/60 transition-colors"
            aria-label="Dismiss advisory"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
