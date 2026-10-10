import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  FileDown,
  Printer,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Info,
  Lightbulb,
  Flame,
  ShieldAlert,
  MapPin,
  Search,
  Globe,
  Loader2,
  ChevronDown,
  ChevronUp,
  Layers,
  Activity,
  Thermometer,
  Clock,
  Sparkles,
  Building2,
  Radio,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { fetchInsights, searchNominatimLocations } from '../../services/api';
import HotspotDetailPanel from '../../components/admin/HotspotDetailPanel';
import AnalyticsSection from '../../components/dashboard/AnalyticsSection';

const TIER_STYLES = {
  critical: 'bg-red-50 text-red-700 border-red-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  moderate: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  unknown: 'bg-slate-100 text-slate-600 border-slate-200',
};

const ACTION_METADATA = {
  'dense-pop-priority': {
    title: 'Deploy Shaded Cooling Centers & Drinking Water Points',
    leadAgency: 'Municipal Corporation / PDMA & Rescue 1122',
    urgency: 'HIGH PRIORITY',
    urgencyStyle: 'bg-red-50 text-red-700 border-red-200',
  },
  'monitor-volume': {
    title: 'Activate Rapid Heat Stress Surveillance & Escalation',
    leadAgency: 'District Health Office & Emergency Ops Centre',
    urgency: 'MONITORING',
    urgencyStyle: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  'standard-advisory': {
    title: 'Broadcast Localized Public Heat & Hydration Advisory',
    leadAgency: 'District Administration / Public Info Office',
    urgency: 'PUBLIC HEALTH',
    urgencyStyle: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  'extreme-temp-protocol': {
    title: 'Activate Extreme Temperature Protocol (Nighttime Hours)',
    leadAgency: 'PDMA / Civil Protection',
    urgency: 'CRITICAL ACTION',
    urgencyStyle: 'bg-red-100 text-red-800 border-red-300',
  },
  'verify-coverage': {
    title: 'Verify Ground Relief Coverage & Relief Supplies',
    leadAgency: 'Field Inspection Teams / Municipal Corp',
    urgency: 'VERIFICATION',
    urgencyStyle: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  'school-shift': {
    title: 'Shift School & Vulnerable Facility Hours',
    leadAgency: 'District Education Authority',
    urgency: 'PROTECTION',
    urgencyStyle: 'bg-purple-50 text-purple-700 border-purple-200',
  },
};

const PHASE_CONFIG = {
  1: {
    name: 'Phase 1: Immediate Relief (First 48 Hours)',
    short: 'Phase 1 (First 48h)',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    border: 'border-l-rose-500',
    icon: '⚡',
    subtitle: 'Drinking water points, mobile cooling units & public heat alerts',
  },
  2: {
    name: 'Phase 2: Preventive Measures (Weeks 1–2)',
    short: 'Phase 2 (Weeks 1–2)',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    border: 'border-l-amber-500',
    icon: '🛠️',
    subtitle: 'Adjust school/work hours, protect vulnerable sites & prepare clinics',
  },
  3: {
    name: 'Phase 3: Ongoing Monitoring & Watch',
    short: 'Phase 3 (Ongoing Watch)',
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
    border: 'border-l-purple-500',
    icon: '👁️',
    subtitle: 'Track incoming heat reports and escalate if reports spike',
  },
};

function resolveActionMetadata(id, text) {
  if (ACTION_METADATA[id]) {
    return ACTION_METADATA[id];
  }
  const cleanStr = String(text || '').toLowerCase();
  if (/water|cooling|hydrat/i.test(cleanStr)) {
    return {
      title: 'Deploy Shaded Cooling Centers & Drinking Water Points',
      leadAgency: 'Municipal Corporation / PDMA & Rescue 1122',
      urgency: 'HIGH PRIORITY',
      urgencyStyle: 'bg-red-50 text-red-700 border-red-200',
    };
  }
  if (/health|hospital|clinic|medical/i.test(cleanStr)) {
    return {
      title: 'Prepare Health Clinics & Emergency Heat Stroke Wards',
      leadAgency: 'Health Department',
      urgency: 'HIGH PRIORITY',
      urgencyStyle: 'bg-rose-50 text-rose-700 border-rose-200',
    };
  }
  if (/advisory|alert|warning|broadcast/i.test(cleanStr)) {
    return {
      title: 'Broadcast Localized Public Heat Warning',
      leadAgency: 'District Administration',
      urgency: 'PUBLIC HEALTH',
      urgencyStyle: 'bg-blue-50 text-blue-700 border-blue-200',
    };
  }
  if (/monitor|surveillance|double/i.test(cleanStr)) {
    return {
      title: 'Activate 24-Hour Surveillance Protocol',
      leadAgency: 'District Health Office',
      urgency: 'SURVEILLANCE',
      urgencyStyle: 'bg-amber-50 text-amber-800 border-amber-200',
    };
  }
  return {
    title: 'Implement Targeted Cooling & Mitigation Measures',
    leadAgency: 'Municipal Corporation / District Administration',
    urgency: 'TACTICAL INTERVENTION',
    urgencyStyle: 'bg-slate-100 text-slate-700 border-slate-200',
  };
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Pre-defined City Codes (3-letter abbreviations)
const CITY_CODES = {
  karachi: 'KHI',
  lahore: 'LHR',
  faisalabad: 'FSD',
  multan: 'MUX',
  rawalpindi: 'RWP',
  islamabad: 'ISB',
  peshawar: 'PEW',
  quetta: 'QTA',
  gujranwala: 'GUJ',
  sialkot: 'SKT',
  hyderabad: 'HYD',
  bahawalpur: 'BWP',
  sukkur: 'SKR',
  larkana: 'LKN',
  mardan: 'MDN',
  abbottabad: 'ABT',
  sargodha: 'SGD',
  gujrat: 'GJT',
  sahiwal: 'SWL',
  sheikhupura: 'SKP',
  jhang: 'JHG',
  rahim_yar_khan: 'RYK',
  kasur: 'KSR',
  okara: 'OKR',
  mingora: 'MNG',
  deraismailkhan: 'DIK',
  d_g_khan: 'DGK',
  mirpur: 'MPR',
  gwadar: 'GWD',
  turbat: 'TRB',
  khuzdar: 'KZD',
  chaman: 'CHM',
};

// Pre-defined Area / Locality Codes (3-letter abbreviations)
const AREA_CODES = {
  'gulshan-e-iqbal': 'GLS',
  'gulshan': 'GLS',
  'saddar': 'SDR',
  'gulberg': 'GLB',
  'johar town': 'JHR',
  'johar': 'JHR',
  'madina town': 'MDN',
  'gulgasht colony': 'GLG',
  'gulgasht': 'GLG',
  'cantt': 'CNT',
  'cantonment': 'CNT',
  'model town': 'MDL',
  'satellite town': 'STL',
  'blue area': 'BLU',
  'g-9 markaz': 'G09',
  'g-9': 'G09',
  'g-8': 'G08',
  'g-10': 'G10',
  'f-6': 'F06',
  'f-7': 'F07',
  'f-8': 'F08',
  'f-10': 'F10',
  'i-8': 'I08',
  'i-9': 'I09',
  'i-10': 'I10',
  'latifabad': 'LTF',
  'qasimabad': 'QSM',
  'hayatabad': 'HYT',
  'university town': 'UNI',
  'korangi': 'KRG',
  'clifton': 'CLF',
  'north nazimabad': 'NNZ',
  'nazimabad': 'NZM',
  'dha': 'DHA',
  'malir': 'MLR',
  'lyari': 'LYR',
  'site': 'SIT',
  'jinnah colony': 'JNH',
  'peoples colony': 'PPL',
  'allama iqbal town': 'AIT',
  'iqbal town': 'AIT',
  'defence': 'DEF',
  'bahria town': 'BHR',
  'samundri road': 'SMD',
  'shamsabad': 'SHM',
  'liaquat bagh': 'LQT',
  'wariach': 'WRC',
};

function getCityCode(cityName) {
  if (!cityName) return 'PAK';
  const clean = String(cityName).trim().toLowerCase().replace(/[^a-z]/g, '');
  if (CITY_CODES[clean]) return CITY_CODES[clean];
  for (const [k, code] of Object.entries(CITY_CODES)) {
    if (clean.includes(k) || k.includes(clean)) return code;
  }
  const letters = clean.replace(/[^a-z]/g, '').toUpperCase();
  return letters.slice(0, 3).padEnd(3, 'X');
}

function getAreaCode(areaName) {
  if (!areaName) return 'ZON';
  const clean = String(areaName).trim().toLowerCase();
  if (AREA_CODES[clean]) return AREA_CODES[clean];
  for (const [k, code] of Object.entries(AREA_CODES)) {
    if (clean.includes(k) || k.includes(clean)) return code;
  }
  const words = clean.split(/[\s\-_]+/).filter(Boolean);
  if (words.length >= 3) {
    return (words[0][0] + words[1][0] + words[2][0]).toUpperCase();
  }
  if (words.length === 2) {
    return (words[0].slice(0, 2) + words[1].slice(0, 1)).toUpperCase();
  }
  const letters = clean.replace(/[^a-z0-9]/g, '');
  const consonants = letters.replace(/[aeiou]/g, '');
  if (consonants.length >= 3) {
    return consonants.slice(0, 3).toUpperCase();
  }
  return letters.slice(0, 3).toUpperCase().padEnd(3, 'X');
}

function getClusterNum(clusterId, fallbackIndex = 0) {
  if (clusterId) {
    const match = String(clusterId).match(/\d+/);
    if (match) return match[0].padStart(2, '0');
  }
  return String(fallbackIndex + 1).padStart(2, '0');
}

function getHotspotLocality(h) {
  if (!h) return '';
  if (h.area && h.city && h.area.toLowerCase() !== h.city.toLowerCase()) return h.area;
  if (h.district && h.city && h.district.toLowerCase() !== h.city.toLowerCase()) return h.district;
  if (h.zone && h.city && h.zone.toLowerCase() !== h.city.toLowerCase()) return h.zone;
  return h.area || h.district || h.zone || '';
}

function formatClusterCode(h, scopeMode = 'city', index = 0) {
  if (!h) return `CL-${String(index + 1).padStart(2, '0')}`;

  const locality = getHotspotLocality(h);
  const num = getClusterNum(h.clusterId, index);
  const cityCode = getCityCode(h.city);
  const areaCode = locality ? getAreaCode(locality) : cityCode;

  // In Province Scope: combine City + Area so all clusters across the province are globally distinct
  // e.g. LHR-GLB-01, MUX-GLG-01, KHI-GLS-01
  if (scopeMode === 'province') {
    return `${cityCode}-${areaCode}-${num}`;
  }

  // In City Scope (e.g. Karachi, Lahore): area-wise identifier
  // e.g. GLS-01 (Gulshan-e-Iqbal), SDR-02 (Saddar), GLB-01 (Gulberg)
  return `${areaCode}-${num}`;
}

function formatClusterLocation(h, fallback = 'Zone', scopeMode = 'city') {
  if (!h) return fallback;
  const locality = getHotspotLocality(h);
  if (locality) {
    if (scopeMode === 'city') {
      return locality;
    }
    return `${h.city} (${locality})`;
  }
  return h.area || h.district || h.city || fallback;
}

// Universal Heat Index calculation for ANY location, city, or village across Pakistan
function getUniversalHumidity(city, centroid) {
  if (centroid && typeof centroid.lat === 'number' && typeof centroid.lng === 'number') {
    const { lat, lng } = centroid;
    if (lat <= 26.2 && lng >= 61.0 && lng <= 69.5) return 60; // coastal zone along Arabian Sea
    if (lat >= 34.0) return 42; // northern highlands and mountain valleys
    if (lng <= 66.5 && lat < 33.5) return 28; // western arid plateau
    return 40; // central plains & Indus river basin
  }
  if (city) {
    const c = String(city).toLowerCase();
    if (/coast|sea|beach|karachi|thatta|badin|gwadar|pasni|ormara|hub|keamari|korangi/i.test(c)) return 60;
    if (/desert|thar|cholistan|nushki|chagai|kharan|panjgur|sibi|jacobabad/i.test(c)) return 28;
    if (/quetta|ziarat|kalat|pishin|zhob|loralai/i.test(c)) return 30;
    if (/gilgit|skardu|hunza|chitral|swat|kaghan|murree|abbottabad|muzaffarabad/i.test(c)) return 42;
  }
  return 40;
}

function calculateHeatIndex(tempC, humidity = 40) {
  if (tempC == null || tempC < 20) return tempC;
  const rh = typeof humidity === 'number' && humidity > 0 && humidity <= 100 ? humidity : 40;
  const tempF = (tempC * 9) / 5 + 32;
  const hiF =
    -42.379 +
    2.04901523 * tempF +
    10.14333127 * rh -
    0.22475541 * tempF * rh -
    0.00683783 * tempF * tempF -
    0.05481717 * rh * rh +
    0.00122874 * tempF * tempF * rh +
    0.00085282 * tempF * rh * rh -
    0.00000199 * tempF * tempF * rh * rh;
  return Number((((hiF - 32) * 5) / 9).toFixed(1));
}

function resolveHeatIndex(h) {
  if (h?.heatIndexMean != null) return h.heatIndexMean;
  const temp = h?.peakTemp ?? h?.avgTemp;
  if (temp != null && temp >= 20) {
    const humidity = getUniversalHumidity(h.city, h.centroid);
    return calculateHeatIndex(temp, humidity);
  }
  return null;
}

function CustomTooltip({ active, payload, label, unit = '' }) {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    return (
      <div className="bg-slate-900/95 text-white px-3 py-2 rounded-lg text-xs shadow-xl border border-slate-800">
        <p className="font-semibold text-slate-300 mb-0.5">{label}</p>
        <p className="font-bold text-emerald-400">
          {val != null ? `${val}${unit}` : 'No data'}
        </p>
      </div>
    );
  }
  return null;
}

const PROVINCES = [
  { id: 'punjab', name: 'Punjab', city: 'Lahore' },
  { id: 'sindh', name: 'Sindh', city: 'Karachi' },
  { id: 'kpk', name: 'Khyber Pakhtunkhwa', city: 'Peshawar' },
  { id: 'balochistan', name: 'Balochistan', city: 'Quetta' },
  { id: 'islamabad', name: 'Islamabad Capital Territory', city: 'Islamabad' },
  { id: 'ajk', name: 'Azad Kashmir', city: 'Muzaffarabad' },
  { id: 'gb', name: 'Gilgit Baltistan', city: 'Gilgit' },
];

export default function AreaInsights() {
  const [scopeMode, setScopeMode] = useState('city'); // 'city' | 'province'
  const [selectedCity, setSelectedCity] = useState('Karachi');
  const [selectedCityProvince, setSelectedCityProvince] = useState('');
  const [citySearchInput, setCitySearchInput] = useState('Karachi');
  const [selectedProvince, setSelectedProvince] = useState(PROVINCES[0].name); // 'Punjab'
  const [days, setDays] = useState(30);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedHotspotId, setExpandedHotspotId] = useState(null);

  // Live Nominatim OpenStreetMap Search State
  const [nominatimResults, setNominatimResults] = useState([]);
  const [searchingOsm, setSearchingOsm] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchContainerRef = useRef(null);
  const osmAbortRef = useRef(null);

  const loadData = useCallback(async (mode, city, province, currentDays) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        days: currentDays,
        includeSynthetic: false,
      };
      if (mode === 'city') {
        params.city = (city || 'Karachi').trim();
        if (province && province.trim()) {
          params.province = province.trim();
        }
      } else {
        const provDef = PROVINCES.find((p) => p.name === province) || PROVINCES[0];
        params.province = provDef.name;
        params.city = provDef.city || provDef.name;
      }
      const res = await fetchInsights(params);
      setData(res);
    } catch (err) {
      console.error('Failed to load insights:', err);
      const msg =
        err?.response?.data?.message ||
        (err?.response?.status === 503
          ? 'Insights service is temporarily unavailable due to a database outage.'
          : err?.response?.status === 400
            ? 'City not recognized. Please choose a Pakistani city from the search suggestions.'
            : 'Failed to generate area insights.');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Sync state on filter change
  useEffect(() => {
    if (scopeMode === 'city') {
      loadData('city', selectedCity, selectedCityProvince, days);
    } else {
      loadData('province', '', selectedProvince, days);
    }
  }, [scopeMode, selectedCity, selectedCityProvince, selectedProvince, days, loadData]);

  // Live OpenStreetMap Nominatim search debounced
  useEffect(() => {
    if (scopeMode !== 'city') return;
    const query = citySearchInput.trim();
    if (query.length < 2) {
      setNominatimResults([]);
      setSearchingOsm(false);
      return;
    }

    setSearchingOsm(true);
    if (osmAbortRef.current) {
      osmAbortRef.current.abort();
    }
    const abortController = new AbortController();
    osmAbortRef.current = abortController;

    const timer = setTimeout(async () => {
      try {
        const results = await searchNominatimLocations(query, {
          signal: abortController.signal,
        });
        setNominatimResults(results);
      } catch (err) {
        if (err?.name !== 'AbortError') {
          setNominatimResults([]);
        }
      } finally {
        setSearchingOsm(false);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
  }, [citySearchInput, scopeMode]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleScopeModeChange = (mode) => {
    setScopeMode(mode);
    setShowDropdown(false);
  };

  const handleProvinceChange = (newProvince) => {
    setSelectedProvince(newProvince);
  };

  const handleCitySearchSubmit = (e) => {
    e.preventDefault();
    const query = citySearchInput.trim();
    if (!query) {
      toast.error('Please enter a city name to search');
      return;
    }
    setShowDropdown(false);
    setSelectedCity(query);
    const matchedOsm = nominatimResults.find(
      (r) => r.name.toLowerCase() === query.toLowerCase() || r.city?.toLowerCase() === query.toLowerCase()
    );
    setSelectedCityProvince(matchedOsm?.province || '');
  };

  const handleCityInputChange = (e) => {
    const val = e.target.value;
    setCitySearchInput(val);
    setShowDropdown(true);
  };

  const handleSelectLocation = (loc) => {
    const targetName = loc.city || loc.name;
    setCitySearchInput(targetName);
    setSelectedCity(targetName);
    setSelectedCityProvince(loc.province || '');
    setShowDropdown(false);
  };


  const handleExportReport = () => {
    if (!data) return;

    // Derive target location based on active scope mode (city vs province)
    const targetName =
      scopeMode === 'city'
        ? (data?.scope?.city || selectedCity || 'City')
        : (data?.scope?.province || selectedProvince || 'Province');

    // Cross-platform safe filename string (safe for Windows, macOS, Linux)
    const cleanName = String(targetName).trim().replace(/[^a-zA-Z0-9_-]+/g, '_');
    const daysWindow = data?.scope?.days || days || 30;
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    // Standardized report name: ThermaX_<Location>_Thermal_Report_<Days>D_<Date>
    const reportFileName = `ThermaX_${cleanName}_Thermal_Report_${daysWindow}D_${dateStr}`;

    const originalTitle = document.title;
    document.title = reportFileName;

    // Helpful reminder: Chrome requires 'Save as PDF' (not 'Microsoft Print to PDF') to auto-name
    toast(
      'In the dialog: Select Destination → "Save as PDF" (not Microsoft Print to PDF) to auto-fill the file name and save to Downloads.',
      { icon: '💡', duration: 7000 }
    );

    const restoreTitle = () => {
      document.title = originalTitle;
      window.removeEventListener('afterprint', restoreTitle);
    };

    window.addEventListener('afterprint', restoreTitle);

    try {
      window.print();
    } finally {
      // Fallback restore in case browser does not fire afterprint event
      setTimeout(restoreTitle, 3000);
    }
  };

  const toggleHotspot = (clusterId) => {
    setExpandedHotspotId((prev) => (prev === clusterId ? null : clusterId));
  };

  // Smart classification and deduplication of takeaways for authority leadership
  const operationalTakeaways = useMemo(() => {
    if (!data?.takeaways || !Array.isArray(data.takeaways)) {
      return { epicenters: [], dangerWindows: [], receptors: [], trends: [], other: [] };
    }

    const epicenters = [];
    const dangerWindows = [];
    const receptors = [];
    const trends = [];
    const other = [];

    for (const t of data.takeaways) {
      if (!t || typeof t !== 'string') continue;

      // 1. Filter out duplicate report counts (already highlighted in KPI grid and Memo)
      if (/^Based on \d+ verified reports/i.test(t)) continue;

      // 2. Filter out duplicate recommendation if already covered in Hero Directive
      if (/^Recommended focus:/i.test(t)) continue;

      // 3. Classify into operational facets
      if (/^Highest-risk zone:/i.test(t) || /Ranked #\d+/i.test(t)) {
        epicenters.push(t);
      } else if (/Extreme heat concentrates|danger window|restrict outdoor labor/i.test(t)) {
        dangerWindows.push(t);
      } else if (/overlapping schools|receptors|clinics/i.test(t)) {
        receptors.push(t);
      } else if (
        /Report volume (up|down)|averages \d+(\.\d+)?°C (above|below)|trends withheld|Fewer than \d+ verified reports/i.test(
          t
        )
      ) {
        trends.push(t);
      } else {
        other.push(t);
      }
    }

    return { epicenters, dangerWindows, receptors, trends, other };
  }, [data?.takeaways]);

  const priorityActions = (data?.hotspots || []).flatMap((hs, hsIdx) =>
    (hs.directives || []).map((d, idx) => {
      const tier = hs.riskTier || 'high';
      const priority = tier.charAt(0).toUpperCase() + tier.slice(1);
      return {
        key: `${hs.id || hs._id || hs.clusterId || 'hs'}-${hsIdx}-${d.id || 'dir'}-${idx}`,
        id: d.id,
        area: `${formatClusterLocation(hs, data?.scope?.city || 'Area', scopeMode)} Hotspot (${formatClusterCode(hs, scopeMode, hsIdx)})`,
        action: d.text || d.directive || 'Implement targeted cooling measures.',
        priority,
      };
    })
  );

  // Unified Phased Operational Municipal Heat Action Plan (Option A)
  const synthesizedPlan = useMemo(() => {
    if (!data) return [];
    const sourceDirectives =
      data.topDirectives && data.topDirectives.length > 0
        ? data.topDirectives
        : priorityActions;

    // Filter out internal system disclaimers and non-actions from municipal response
    const filtered = sourceDirectives.filter(
      (d) => d.id !== 'provisional-note' && d.id !== 'routine-monitor'
    );

    const backendPlanMap = new Map();
    for (const item of data.actionPlan || []) {
      if (item.directiveId) backendPlanMap.set(item.directiveId, item);
    }

    const items = filtered.map((rec) => {
      const meta = resolveActionMetadata(rec.id, rec.text || rec.action);
      const planItem = backendPlanMap.get(rec.id);

      const matchingHotspots = (data.hotspots || []).filter((h) =>
        (h.directives || []).some((d) => d.id === rec.id)
      );

      const targetLocations = matchingHotspots.map((h, hIdx) => ({
        area: formatClusterLocation(h, data?.scope?.city || 'Zone', scopeMode),
        clusterId: formatClusterCode(h, scopeMode, hIdx),
        tier: h.riskTier || 'moderate',
      }));

      let phaseNumber = planItem?.phaseNumber;
      if (!phaseNumber) {
        const str = `${rec.id} ${rec.text || rec.action}`.toLowerCase();
        if (/water|cooling|mist|hydrat|hospital-alert|disaster-coord/i.test(str)) {
          phaseNumber = 1;
        } else if (/advisory|alert|warning|school|clinic|hospital|labor|labour|tree|shade|infrastructure|vulnerable/i.test(str)) {
          phaseNumber = 2;
        } else {
          phaseNumber = 3;
        }
      }

      return {
        id: rec.id,
        title: meta.title,
        text: rec.text || rec.action,
        leadAgency: planItem?.owner || meta.leadAgency,
        urgency: meta.urgency,
        urgencyStyle: meta.urgencyStyle,
        timeline:
          planItem?.timeline ||
          (phaseNumber === 1
            ? 'Immediate (0–48 hours)'
            : phaseNumber === 2
              ? 'Short-term (1–8 weeks)'
              : 'Active Surveillance'),
        phaseNumber,
        targetLocations,
        hotspotCount: targetLocations.length || rec.hotspotCount || 1,
        evidence: planItem?.evidence || `Applies to ${targetLocations.length} active hotspot zones`,
      };
    });

    // Ensure strictly sequential phase numbering (e.g. Phase 1, Phase 2, Phase 3 without skips)
    const uniquePhases = [...new Set(items.map((i) => i.phaseNumber))].sort((a, b) => a - b);
    const phaseMap = new Map();
    uniquePhases.forEach((p, idx) => phaseMap.set(p, idx + 1));

    const sequenced = items.map((item) => ({
      ...item,
      phaseNumber: phaseMap.get(item.phaseNumber) || item.phaseNumber,
    }));

    return sequenced.sort((a, b) => a.phaseNumber - b.phaseNumber || b.hotspotCount - a.hotspotCount);
  }, [data, priorityActions]);

  // Mapped data for the 3 visual analytics cards: Report Trend, Severity Mix, Area Heat Index
  const analyticsCharts = useMemo(() => {
    if (!data) return { trend: [], severity: [], hotspotGrowth: [] };

    // 1. Trend: map volumeSeries
    const trend = (data.volumeSeries || []).map((v) => ({
      date: formatDate(v.date),
      reports: v.count ?? 0,
    }));

    // 2. Severity: map severityDistribution
    const severity = (data.severityDistribution || []).map((s) => ({
      severity: `S${s.severity}`,
      value: s.count ?? 0,
      count: s.count ?? 0,
    }));

    // 3. Hotspot Growth / Area Heat Index: map top hotspots
    const hotspotGrowth = (data.hotspots || []).slice(0, 6).map((h) => {
      const tier = (h.riskTier || 'unknown').toLowerCase();
      const priority =
        tier === 'critical'
          ? 'Critical'
          : tier === 'high'
            ? 'High'
            : tier === 'moderate'
              ? 'Moderate'
              : tier === 'low'
                ? 'Low'
                : 'Unscored';

      const isUnscored = h.tvi == null;
      const score = !isUnscored ? Math.round(h.tvi * 100) : null;

      return {
        area: formatClusterLocation(h, h.clusterId || 'Zone', scopeMode),
        growth: score,
        isUnscored,
        priority: isUnscored ? 'Unscored' : priority,
      };
    });

    return { trend, severity, hotspotGrowth };
  }, [data]);

  const receptorMap = useMemo(() => {
    const map = new Map();
    for (const rf of data?.receptorFlags || []) {
      if (rf.hotspotId) map.set(String(rf.hotspotId), rf.receptors || []);
      if (rf.area) map.set(String(rf.area).toLowerCase(), rf.receptors || []);
    }
    return map;
  }, [data?.receptorFlags]);

  return (
    <div className="p-6 lg:p-8 space-y-6 print:space-y-3.5 print:p-0 max-w-7xl mx-auto print-full-width">
      {/* F5: Official Letterhead Print Header (print only) */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-normal text-slate-900">
              ThermaX — Area Thermal Risk Briefing
            </h1>
            <p className="text-xs text-slate-600 font-semibold mt-0.5">
              Draft briefing generated by ThermaX — verify before official circulation.
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono font-bold text-slate-900 block">
              {data?.scope?.briefRef || 'HTX-BRIEF'}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              {new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })} PKT
            </span>
          </div>
        </div>
        <div className="mt-3 pt-2 border-t border-slate-200 text-xs flex justify-between text-slate-700 font-medium">
          <span>Target Scope: <strong>{scopeMode === 'province' ? (data?.scope?.province || selectedProvince) : (data?.scope?.city || selectedCity)}{data?.scope?.area ? ` • ${data.scope.area}` : ''}</strong></span>
          <span>Observation Window: <strong>Past {data?.scope?.days || days} Days</strong></span>
        </div>
      </div>

      {/* Top Banner & Exits Action Bar (screen only) */}
      <div className="no-print print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Flame className="w-5 h-5 text-emerald-600" />
            <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
              Area Heat Insights &amp; Action Plan
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Clear heat risk summaries, danger zones, and practical steps for local authorities.
          </p>
        </div>

        {/* Exit Action (Controls hidden during print) */}
        <div className="flex flex-col items-end gap-1.5 no-print print:hidden shrink-0">
          <button
            type="button"
            onClick={handleExportReport}
            disabled={loading || !data}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            title="Export Thermal Report as PDF"
          >
            <FileDown className="w-3.5 h-3.5 text-white" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Scope Controls Bar (Hidden during print) */}
      <div className="no-print print:hidden bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-4">
        {/* Scope Mode Switcher Tabs */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => handleScopeModeChange('city')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${scopeMode === 'city'
                ? 'bg-white text-emerald-800 shadow-2xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              City Search
            </button>
            <button
              type="button"
              onClick={() => handleScopeModeChange('province')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${scopeMode === 'province'
                ? 'bg-white text-emerald-800 shadow-2xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              Province Scope
            </button>
          </div>

          <span className="text-[11px] text-slate-400 font-medium">
            {scopeMode === 'city'
              ? 'Search any city or district across Pakistan'
              : 'Showing combined heat data across the entire province'}
          </span>
        </div>

        {/* Filter Controls Form */}
        {scopeMode === 'province' ? (
          /* Province Scope: ONLY the list of provinces occurs. Admin selects province -> province report occurs */
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <div className="md:col-span-8">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Select Province
              </label>
              <div className="relative">
                <select
                  value={selectedProvince}
                  onChange={(e) => handleProvinceChange(e.target.value)}
                  className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 focus:bg-white focus:outline-none focus:border-emerald-600 appearance-none cursor-pointer"
                >
                  {PROVINCES.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Time Window Pills */}
            <div className="md:col-span-3">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Time Window
              </label>
              <div className="flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
                {[7, 30, 90].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDays(d)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${days === d
                      ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>

            {/* Refresh Action */}
            <div className="md:col-span-1 flex items-end">
              <button
                type="button"
                onClick={() => loadData('province', '', selectedProvince, days)}
                disabled={loading}
                className="w-full flex items-center justify-center p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                title="Refresh Province Briefing"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
              </button>
            </div>
          </div>
        ) : (
          /* City Scope: ONLY search bar with OpenStreetMap Nominatim live search */
          <form onSubmit={handleCitySearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <div className="md:col-span-8">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Search City or Town in Pakistan
                </label>
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <Globe className="w-2.5 h-2.5" />
                  Live Location Search
                </span>
              </div>
              <div ref={searchContainerRef} className="relative">
                <div className="relative flex items-center">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    value={citySearchInput}
                    onChange={handleCityInputChange}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="e.g. Moro, Liaquatpur, F-7, Kharian, Gwadar, Abbottabad..."
                    className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-lg pl-8.5 pr-24 py-2.5 focus:bg-white focus:outline-none focus:border-emerald-600 shadow-2xs"
                  />
                  <div className="absolute right-1.5 flex items-center gap-1.5">
                    {searchingOsm && (
                      <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin mr-0.5" />
                    )}
                    {citySearchInput && (
                      <button
                        type="button"
                        onClick={() => {
                          setCitySearchInput('');
                          setNominatimResults([]);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-600 text-xs cursor-pointer font-bold rounded"
                        title="Clear input"
                      >
                        ✕
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={loading || !citySearchInput.trim()}
                      className="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                    >
                      Search
                    </button>
                  </div>
                </div>

                {/* Floating Live Autocomplete Dropdown for Nominatim & National Cities */}
                {showDropdown && citySearchInput.trim().length >= 2 && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 max-h-80 overflow-y-auto">
                    {/* Live OpenStreetMap Results */}
                    {nominatimResults.length > 0 && (
                      <div>
                        <div className="px-3 py-1.5 bg-emerald-50/70 text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center justify-between border-b border-emerald-100/60">
                          <span className="flex items-center gap-1 font-extrabold">
                            <Globe className="w-3 h-3 text-emerald-600" />
                            OpenStreetMap Nominatim Results
                          </span>
                          <span className="text-[9px] text-emerald-600 font-medium">Live Geocoded</span>
                        </div>
                        {nominatimResults.map((loc) => (
                          <button
                            key={loc.id || loc.displayName}
                            type="button"
                            onClick={() => handleSelectLocation(loc)}
                            className="w-full text-left px-3 py-2 hover:bg-emerald-50/60 transition-colors cursor-pointer flex items-start gap-2.5 group border-b border-slate-50 last:border-b-0"
                          >
                            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
                                  {loc.name}
                                </span>
                                {loc.province && (
                                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                    {loc.province}
                                  </span>
                                )}
                                {loc.district && (
                                  <span className="text-[10px] text-slate-400">
                                    {loc.district}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                {loc.displayName}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Loading State */}
                    {searchingOsm && nominatimResults.length === 0 && (
                      <div className="px-4 py-3 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                        <span>Searching OpenStreetMap across Pakistan...</span>
                      </div>
                    )}

                    {/* No Results */}
                    {!searchingOsm && nominatimResults.length === 0 && (
                      <div className="px-4 py-3 text-center text-xs text-slate-400">
                        No locations found for &ldquo;{citySearchInput}&rdquo;. Press Search to query database directly.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Time Window Pills */}
            <div className="md:col-span-3">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Time Window
              </label>
              <div className="flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
                {[7, 30, 90].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDays(d)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${days === d
                      ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>

            {/* Refresh Action */}
            <div className="md:col-span-1 flex items-end">
              <button
                type="button"
                onClick={() => loadData('city', selectedCity, selectedCityProvince, days)}
                disabled={loading}
                className="w-full flex items-center justify-center p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                title="Refresh City Briefing"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
              </button>
            </div>
          </form>
        )}

        {/* Applied Scope indicator */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-slate-500 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-600">Active Area:</span>
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
              {scopeMode === 'city'
                ? `City: ${data?.scope?.city || selectedCity}`
                : `Province: ${data?.scope?.province || selectedProvince} (All Districts Combined)`}
            </span>
            {data?.scope?.province && scopeMode === 'city' && (
              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium">
                {data.scope?.province}
              </span>
            )}
            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium">
              Past {data?.scope?.days || days} days
            </span>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-800 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Unable to generate Area Insights</p>
            <p className="text-red-700 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Main content when data is loaded */}
      {data && (
        <>
          {/* F8 & F6: Unified Executive Authority Directive & 48h Surge Surveillance Header */}
          <div className="rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-sm overflow-hidden print-break-inside-avoid executive-memo-card print:border-slate-300 print:shadow-none print:mb-3">
            {/* Top Masthead Bar */}
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 print:bg-slate-100 print:border-slate-300 print:py-2 print:px-4">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 print:bg-emerald-700 animate-pulse" />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-800">
                      Executive Decision Memo
                    </span>
                    <span className="text-[10px] text-slate-400">•</span>
                    <span className="text-[10px] font-mono text-slate-600 tracking-wide uppercase">
                      {data.scope?.briefRef || 'HTX-OPS-BRIEF'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Official Heat Summary — {data.scope?.province || data.scope?.city || 'Selected Area'} (Based on the past {data.scope?.days || 30} days)
                  </p>
                </div>
              </div>

              {/* Integrated 48-Hour Surveillance Status Chip */}
              {data.escalation && (
                <div
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-2 shadow-2xs print:border-slate-300 ${data.escalation.status === 'ESCALATE'
                    ? 'bg-red-50 border-red-200 text-red-900'
                    : data.escalation.status === 'WATCH'
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : data.escalation.status === 'NO_RECENT_DATA'
                        ? 'bg-slate-100 border-slate-200 text-slate-700'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    }`}
                >
                  <div className="relative flex items-center justify-center">
                    {data.escalation.status === 'ESCALATE' ? (
                      <>
                        <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-red-400 opacity-75" />
                        <ShieldAlert className="w-4 h-4 text-red-600 relative z-10" />
                      </>
                    ) : data.escalation.status === 'WATCH' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    )}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] uppercase tracking-wider leading-none text-slate-500">
                      48-Hour Alert
                    </span>
                    <span className="text-xs leading-tight font-extrabold text-slate-900">
                      {data.escalation.status === 'ESCALATE'
                        ? 'High Surge Alert'
                        : data.escalation.status === 'WATCH'
                          ? 'Watch Status Active'
                          : data.escalation.status === 'NO_RECENT_DATA'
                            ? 'All Quiet (0 recent reports)'
                            : 'Normal Baseline'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Command Directive Grid */}
            <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start print:p-3.5 print:gap-3.5 print:grid-cols-12">
              {/* Left Column: Primary Directive */}
              <div className="lg:col-span-7 xl:col-span-8 space-y-3 print:col-span-7 print:space-y-2">
                <div>
                  <div className="flex items-center gap-2 mb-1.5 print:mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 uppercase tracking-widest">
                      Top Recommended Action
                    </span>
                  </div>
                  {data.actionPlan?.[0] ? (
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug print:text-sm">
                      "{data.actionPlan[0].action}"
                    </h3>
                  ) : (
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug print:text-sm">
                      Deploy Targeted Cooling &amp; Hydration Measures
                    </h3>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal print:text-[11.5px]">
                  {data.ministerBrief}
                </p>

                {/* Metadata Pills */}
                <div className="pt-1 flex flex-wrap items-center gap-2 print:gap-1.5 text-slate-800">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-700 print:py-0.5 print:px-2 print:text-[10px]">
                    <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Lead Team: <strong className="text-slate-900 font-semibold">{data.actionPlan?.[0]?.owner || 'Municipal Corporation / PDMA'}</strong></span>
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-700 print:py-0.5 print:px-2 print:text-[10px]">
                    <Activity className="w-3.5 h-3.5 text-amber-600" />
                    <span>Budget: <strong className="text-slate-900 font-semibold uppercase">{data.actionPlan?.[0]?.costBand || 'Medium'} Cost</strong></span>
                  </div>

                  {data.dangerWindow?.window && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-700 print:py-0.5 print:px-2 print:text-[10px]">
                      <Clock className="w-3.5 h-3.5 text-rose-600" />
                      <span>Safe Hours: <strong className="text-slate-900 font-semibold">Avoid {data.dangerWindow.window} peak heat</strong></span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: 48-Hour Surveillance Detail */}
              {data.escalation && (
                <div className="lg:col-span-5 xl:col-span-4 bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3 print:col-span-5 print:p-2.5 print:space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
                      <span className="text-xs font-bold text-slate-900 uppercase tracking-wider print:text-[10.5px]">
                        Recent Activity (Past 48 Hours)
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {data.escalation.last48hCount ?? 0} reports in 48h
                    </span>
                  </div>

                  <div
                    className={`p-3 print:p-2 rounded-lg border text-xs print:text-[11px] leading-relaxed ${data.escalation.status === 'ESCALATE'
                      ? 'bg-red-50/90 border-red-200 text-red-900'
                      : data.escalation.status === 'WATCH'
                        ? 'bg-amber-50/90 border-amber-200 text-amber-900'
                        : 'bg-white border-slate-200 text-slate-700 shadow-2xs'
                      }`}
                  >
                    {data.escalation.status === 'ESCALATE' ? (
                      <p className="font-medium">
                        <strong className="text-red-800 font-bold block mb-0.5">High Surge Alert Triggered:</strong>
                        Very high number of heat reports received in the last 48 hours ({data.escalation.last48hCount} reports). Open emergency cooling centers and alert hospitals immediately.
                      </p>
                    ) : data.escalation.status === 'WATCH' ? (
                      <p className="font-medium">
                        <strong className="text-amber-800 font-bold block mb-0.5">Watch Status Active:</strong>
                        Heat reports are rising in the last 48 hours ({data.escalation.last48hCount} reports). Prepare water tankers and alert local health clinics.
                      </p>
                    ) : (
                      <p className="font-medium">
                        <strong className="text-emerald-800 font-bold block mb-0.5">Conditions are Stable:</strong>
                        No sudden heat spikes or emergency surges were detected in the past 48 hours. Standard monitoring continues.
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200">
                    <span>Alert Triggers: Watch at 10 reports • Emergency at 20 reports</span>
                    {data.escalation.outlierNotifications &&
                      (data.escalation.outlierNotifications.extreme_contradiction > 0 ||
                        data.escalation.outlierNotifications.enrichment_failed > 0) ? (
                      <span className="text-amber-700 font-mono">
                        {data.escalation.outlierNotifications.extreme_contradiction} Flagged
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-mono font-medium">Data Verified</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Priority Action Areas (Deduplicated Strategic Takeaways) */}
          <div className="space-y-3 print:space-y-1.5 print:mt-1 print-break-inside-avoid">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs print:w-5 print:h-5">
                  <Lightbulb className="w-4 h-4 print:w-3.5 print:h-3.5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight print:text-xs">
                    Priority Action Areas
                  </h2>
                  <p className="text-[11px] text-slate-500 print:text-[10px]">
                    Where to send help, what hours are dangerous, and which public places need protection.
                  </p>
                </div>
              </div>
              <span className="no-print text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100/80 text-emerald-800 border border-emerald-300/60 uppercase tracking-wider">
                Key Priorities
              </span>
            </div>

            {/* 3 Operational Focus Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-3 print-grid-3 print:grid-cols-3 gap-3.5 print:gap-2">
              {/* Pillar 1: Spatial Epicenter & Target Sectors */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 print:p-2.5 shadow-2xs space-y-2.5 print:space-y-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2 print:mb-1">
                    <span className="text-[10px] print:text-[9px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Hottest Area
                    </span>
                    <MapPin className="w-4 h-4 print:w-3 print:h-3 text-emerald-600" />
                  </div>
                  <h3 className="text-sm print:text-xs font-bold text-slate-900">
                    {data.hotspots?.[0]?.area || data.scope?.area || data.scope?.city || 'Priority Area'}
                  </h3>
                  <p className="text-xs print:text-[10.5px] text-slate-600 mt-1 leading-relaxed">
                    {data.hotspots?.[0] ? (
                      <>
                        Hottest recorded zone, with <strong className="font-mono text-slate-800">{data.hotspots[0].reportCount || 0} confirmed reports</strong> and a high of <strong className="font-mono text-slate-800">{data.hotspots[0].peakTemp}°C</strong> ({data.hotspots[0].riskTier || 'moderate'} heat risk).
                      </>
                    ) : (
                      'Heat reports are scattered across the area without one single extreme danger cluster.'
                    )}
                  </p>
                </div>
                <div className="pt-2 print:pt-1 border-t border-slate-100 text-[11px] print:text-[10px] font-medium text-emerald-800 bg-emerald-50/60 p-2 print:p-1.5 rounded-lg">
                  🎯 <strong>What to do:</strong> Send water tankers and set up shaded drinking stations here first.
                </div>
              </div>

              {/* Pillar 2: Thermal Danger Window */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 print:p-2.5 shadow-2xs space-y-2.5 print:space-y-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2 print:mb-1">
                    <span className="text-[10px] print:text-[9px] font-extrabold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Peak Heat Hours
                    </span>
                    <Clock className="w-4 h-4 print:w-3 print:h-3 text-amber-600" />
                  </div>
                  <h3 className="text-sm print:text-xs font-bold text-slate-900">
                    {data.dangerWindow?.window ? data.dangerWindow.window : 'Afternoon Heat Peak (12 PM – 4 PM)'}
                  </h3>
                  <p className="text-xs print:text-[10.5px] text-slate-600 mt-1 leading-relaxed">
                    {data.dangerWindow?.window ? (
                      <>
                        Temperatures are highest between <strong className="font-mono text-slate-800">{data.dangerWindow.window}</strong> (peaking at <strong className="font-mono text-slate-800">{data.dangerWindow.peakMeanTemp}°C</strong> around {data.dangerWindow.peakHour}:00).
                      </>
                    ) : (
                      'No extreme all-day heat wave detected. Temperatures are highest during early afternoon hours.'
                    )}
                  </p>
                </div>
                <div className="pt-2 print:pt-1 border-t border-slate-100 text-[11px] print:text-[10px] font-medium text-amber-800 bg-amber-50/60 p-2 print:p-1.5 rounded-lg">
                  ⏱️ <strong>Safety Rule:</strong> Provide shade and water breaks for outdoor workers; avoid outdoor school activities during peak heat.
                </div>
              </div>

              {/* Pillar 3: Sensitive Receptors & Inter-Agency Coordination */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 print:p-2.5 shadow-2xs space-y-2.5 print:space-y-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2 print:mb-1">
                    <span className="text-[10px] print:text-[9px] font-extrabold uppercase tracking-wider text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                      Places at Risk
                    </span>
                    <Building2 className="w-4 h-4 print:w-3 print:h-3 text-sky-600" />
                  </div>
                  <h3 className="text-sm print:text-xs font-bold text-slate-900">
                    {data.receptorFlags && data.receptorFlags.length > 0
                      ? `${data.receptorFlags.length} Crowded Public Places Nearby`
                      : 'General Public Safety'}
                  </h3>
                  <p className="text-xs print:text-[10.5px] text-slate-600 mt-1 leading-relaxed">
                    {data.receptorFlags && data.receptorFlags.length > 0 ? (
                      <>
                        Heat zones are close to public schools, medical clinics, bus terminals, and busy labor markets.
                      </>
                    ) : (
                      'No direct school or hospital overlaps detected in active clusters. Focus remains on general outdoor workers and commuters.'
                    )}
                  </p>
                </div>
                <div className="pt-2 print:pt-1 border-t border-slate-100 text-[11px] print:text-[10px] font-medium text-sky-800 bg-sky-50/60 p-2 print:p-1.5 rounded-lg">
                  🛡️ <strong>Key Action:</strong> Ensure backup generators are ready at clinics, and set up shaded drinking water stands at bus stops.
                </div>
              </div>
            </div>

            {/* Operational Trajectory  & Baseline Intelligence (Deduplicated Trends) */}
            {operationalTakeaways.trends.length > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 print:p-2 flex flex-wrap items-center gap-3 print:gap-1.5 text-xs print:text-[10px] text-slate-700">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 shrink-0">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <span>Recent Trends &amp; Changes:</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 print:gap-1">
                  {operationalTakeaways.trends.map((trend, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 print:px-2 print:py-0.5 rounded-md text-[11px] print:text-[9.5px] font-medium text-slate-800 shadow-2xs"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {trend}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ========================================================
              PAGE 2: Thermal Analytics & Meteorological Trends
             ======================================================== */}
          <div className="print-break-before space-y-4 print:space-y-2.5">
                  {/* F4: Comparative Rank vs City strip near KPIs */}
                  {data.comparative && data.comparative.areaRank != null && (
                    <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 print:px-3 print:py-1.5 shadow-2xs flex flex-wrap items-center justify-between gap-3 print:border-slate-300 print:shadow-none print-break-inside-avoid">
                      <div className="flex items-center gap-2 text-xs print:text-[10.5px] text-slate-800">
                        <MapPin className="w-4 h-4 print:w-3.5 print:h-3.5 text-emerald-600 shrink-0" />
                        <span>
                          <strong>Area Comparison:</strong> Ranked <strong className="text-emerald-700 font-mono font-bold">#{data.comparative.areaRank}</strong> of{' '}
                          <strong>{data.comparative.areasRanked}</strong> areas in {data.scope?.city || 'city'} by overall heat risk.
                        </span>
                      </div>
                      {data.comparative.areaDeltaC != null && (
                        <div className="text-[11px] print:text-[10px] font-medium text-slate-600 flex items-center gap-1.5">
                          <span>City average: <strong className="font-mono text-slate-800">{data.comparative.cityAvgTemp}°C</strong></span>
                          <span>•</span>
                          <span>
                            Difference vs city:{' '}
                            <strong className={`font-mono ${data.comparative.areaDeltaC > 0 ? 'text-red-600' : 'text-blue-600'}`}>
                              {data.comparative.areaDeltaC > 0 ? `+${data.comparative.areaDeltaC}` : data.comparative.areaDeltaC}°C
                            </strong>
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Key Metrics / KPI Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-5 print-grid-5 print:grid-cols-5 gap-3.5 print:gap-2 print-break-inside-avoid">
                    {/* Total Verified Reports */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4 print:p-2.5 shadow-2xs print:shadow-none print:border-slate-300">
                      <div className="flex items-center justify-between text-slate-400 mb-1 print:mb-0.5">
                        <span className="text-[11px] print:text-[10px] font-bold uppercase tracking-wider">Confirmed Reports</span>
                        <CheckCircle2 className="w-4 h-4 print:w-3.5 print:h-3.5 text-emerald-600" />
                      </div>
                      <p className="text-2xl print:text-xl font-extrabold text-slate-900 font-mono">
                        {data.summary?.totalReports ?? 0}
                      </p>
                      <p className="text-[10px] print:text-[9px] text-slate-400 mt-1 print:mt-0.5 truncate">
                        Verified citizen reports
                      </p>
                    </div>

                    {/* Average Temperature & Delta vs Baseline */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4 print:p-2.5 shadow-2xs print:shadow-none print:border-slate-300">
                      <div className="flex items-center justify-between text-slate-400 mb-1 print:mb-0.5">
                        <span className="text-[11px] print:text-[10px] font-bold uppercase tracking-wider">Average Temperature</span>
                        <Thermometer className="w-4 h-4 print:w-3.5 print:h-3.5 text-amber-500" />
                      </div>
                      <div className="flex items-baseline gap-1">
                        <p className="text-2xl print:text-xl font-extrabold text-slate-900 font-mono">
                          {data.summary?.avgTemp != null ? `${data.summary.avgTemp}°C` : 'N/A'}
                        </p>
                      </div>
                      <div className="mt-1 print:mt-0.5 truncate">
                        {data.scope?.area && data.baseline?.areaAvgTempDelta != null ? (
                          <span
                            className={`inline-flex items-center gap-0.5 text-[11px] print:text-[9px] font-semibold ${data.baseline.areaAvgTempDelta > 0
                              ? 'text-red-600'
                              : data.baseline.areaAvgTempDelta < 0
                                ? 'text-blue-600'
                                : 'text-slate-600'
                              }`}
                          >
                            {data.baseline.areaAvgTempDelta > 0 ? (
                              <TrendingUp className="w-3 h-3 print:w-2.5 print:h-2.5" />
                            ) : data.baseline.areaAvgTempDelta < 0 ? (
                              <TrendingDown className="w-3 h-3 print:w-2.5 print:h-2.5" />
                            ) : (
                              <Minus className="w-3 h-3 print:w-2.5 print:h-2.5" />
                            )}
                            {data.baseline.areaAvgTempDelta > 0 ? `+${data.baseline.areaAvgTempDelta}` : data.baseline.areaAvgTempDelta}
                            °C vs {data.scope?.province || data.scope?.city}
                          </span>
                        ) : data.scope?.area && data.baseline?.cityAvgTemp != null ? (
                          <span className="text-[10px] print:text-[9px] text-slate-400">
                            Province baseline: {data.baseline.cityAvgTemp}°C
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Peak Ambient Temp */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4 print:p-2.5 shadow-2xs print:shadow-none print:border-slate-300">
                      <div className="flex items-center justify-between text-slate-400 mb-1 print:mb-0.5">
                        <span className="text-[11px] print:text-[10px] font-bold uppercase tracking-wider">Highest Temperature</span>
                        <Flame className="w-4 h-4 print:w-3.5 print:h-3.5 text-red-500" />
                      </div>
                      <p className="text-2xl print:text-xl font-extrabold text-slate-900 font-mono">
                        {data.summary?.peakTemp != null ? `${data.summary.peakTemp}°C` : 'N/A'}
                      </p>
                      <p className="text-[10px] print:text-[9px] text-slate-400 mt-1 print:mt-0.5 truncate">
                        Highest verified reading
                      </p>
                    </div>

                    {/* Active Hotspots */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4 print:p-2.5 shadow-2xs print:shadow-none print:border-slate-300">
                      <div className="flex items-center justify-between text-slate-400 mb-1 print:mb-0.5">
                        <span className="text-[11px] print:text-[10px] font-bold uppercase tracking-wider">Active Heat Hotspots</span>
                        <Layers className="w-4 h-4 print:w-3.5 print:h-3.5 text-indigo-500" />
                      </div>
                      <p className="text-2xl print:text-xl font-extrabold text-slate-900 font-mono">
                        {data.summary?.activeHotspots ?? 0}
                      </p>
                      <p className="text-[10px] print:text-[9px] text-slate-400 mt-1 print:mt-0.5 truncate">
                        High-heat clusters identified
                      </p>
                    </div>

                    {/* Critical Hotspots */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4 print:p-2.5 shadow-2xs print:shadow-none print:border-slate-300 col-span-2 md:col-span-1 print:col-span-1">
                      <div className="flex items-center justify-between text-slate-400 mb-1 print:mb-0.5">
                        <span className="text-[11px] print:text-[10px] font-bold uppercase tracking-wider">Critical Danger Hotspots</span>
                        <ShieldAlert className="w-4 h-4 print:w-3.5 print:h-3.5 text-red-600" />
                      </div>
                      <p className="text-2xl print:text-xl font-extrabold text-red-600 font-mono">
                        {data.summary?.criticalHotspots ?? 0}
                      </p>
                      <p className="text-[10px] print:text-[9px] text-slate-400 mt-1 print:mt-0.5 truncate">
                        Severe risk zones
                      </p>
                    </div>
                  </div>

                  {/* Area Analytics Overview Cards (Report Trend, Severity Mix, Area Heat Index) */}
                  <div className="print-break-inside-avoid print:mt-1 print:mb-1.5">
                    <AnalyticsSection
                      charts={analyticsCharts}
                      days={data.scope?.days || days}
                    />
                  </div>

                  {/* Ambient Temperature Trajectory */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5 print:p-3 shadow-2xs print-break-inside-avoid print:border-slate-300 print:shadow-none">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 print:mb-1.5">
                      <div className="flex items-center gap-2">
                        <Thermometer className="w-4 h-4 text-amber-500" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                          Temperature Trend (Past {data.scope?.days || days} Days)
                        </h3>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        {data.dangerWindow?.window && (
                          <span className="inline-flex items-center gap-1.5 text-[11px] print:text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-red-100/90 text-red-800 border border-red-300">
                            <Clock className="w-3 h-3 text-red-600" />
                            Peak Heat Hours: {data.dangerWindow.window} (High of {data.dangerWindow.peakMeanTemp}°C)
                          </span>
                        )}
                        {data.dangerWindow?.reason === 'insufficient-data' && (
                          <span className="text-[10px] text-slate-400 italic">
                            Not enough readings to determine peak hours
                          </span>
                        )}
                        <span className="text-[11px] print:text-[10px] text-slate-400 font-mono">
                          {formatDate(data.scope?.from)} — {formatDate(data.scope?.to)}
                        </span>
                      </div>
                    </div>

                    {!data.dataQuality?.trendEligible ? (
                      // Honest Insufficient Data State
                      <div className="my-auto py-8 px-6 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200">
                        <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-2.5">
                          <Info className="w-5 h-5" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-800 mb-1">
                          Not Enough Data for Trend Line
                        </h4>
                        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                          This area currently has <strong className="text-slate-700">{data.dataQuality?.verifiedCount ?? 0} verified reports</strong>.
                          A minimum of <strong className="text-slate-700">{data.dataQuality?.minReportsForTrend ?? 0} verified reports</strong> is
                          required to show an accurate daily trend line.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div className="h-52 print:h-36 w-full min-w-0">
                          {/* Screen version: responsive */}
                          <div className="print:hidden w-full h-full">
                            <ResponsiveContainer width="100%" height={208} minWidth={0} minHeight={200} initialDimension={{ width: 500, height: 208 }}>
                              <LineChart data={data.tempSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis
                                  dataKey="date"
                                  tickFormatter={formatDate}
                                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                                  stroke="#e2e8f0"
                                />
                                <YAxis
                                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                                  stroke="#e2e8f0"
                                  domain={['dataMin - 2', 'dataMax + 2']}
                                />
                                <Tooltip content={<CustomTooltip unit="°C" />} />
                                <Line
                                  type="monotone"
                                  dataKey="avgTemp"
                                  stroke="#f59e0b"
                                  strokeWidth={2.5}
                                  connectNulls
                                  dot={{ r: 3, fill: '#f59e0b' }}
                                  activeDot={{ r: 5 }}
                                  isAnimationActive={false}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>

                          {/* Print version: fixed vector chart */}
                          <div className="hidden print:block w-full">
                            <LineChart width={680} height={140} data={data.tempSeries} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis
                                dataKey="date"
                                tickFormatter={formatDate}
                                tick={{ fontSize: 9, fill: '#64748b' }}
                                stroke="#cbd5e1"
                              />
                              <YAxis
                                tick={{ fontSize: 9, fill: '#64748b' }}
                                stroke="#cbd5e1"
                                domain={['dataMin - 2', 'dataMax + 2']}
                              />
                              <Line
                                type="monotone"
                                dataKey="avgTemp"
                                stroke="#f59e0b"
                                strokeWidth={2.5}
                                connectNulls
                                dot={{ r: 2.5, fill: '#f59e0b' }}
                                isAnimationActive={false}
                              />
                            </LineChart>
                          </div>
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs print:text-[10px] text-slate-500">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                            Daily Average Temperature
                          </span>
                          {data.baseline?.areaAvgTempDelta != null && (
                            <span className="text-[11px] print:text-[10px] font-medium text-slate-600">
                              Difference vs {data.scope?.province || data.scope?.city} baseline:{' '}
                              <strong className={data.baseline.areaAvgTempDelta > 0 ? 'text-red-600' : 'text-blue-600'}>
                                {data.baseline.areaAvgTempDelta > 0 ? `+${data.baseline.areaAvgTempDelta}` : data.baseline.areaAvgTempDelta}°C
                              </strong>
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* F7: Root-Cause Breakdown — Why is this area hot? */}
                  {data.causeBreakdown && data.causeBreakdown.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 p-4 print:p-2.5 shadow-2xs print:border-slate-300 print:shadow-none space-y-3 print:space-y-1.5 print-break-inside-avoid">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-2 print:pb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
                            <Flame className="w-3.5 h-3.5" />
                          </div>
                          <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                            Why Is This Area Hot? (Reported by Citizens)
                          </h3>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">
                          Top {data.causeBreakdown.length} causes mentioned in verified citizen reports
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 print-grid-2 print:grid-cols-2 gap-x-4 gap-y-2 pt-1">
                        {data.causeBreakdown.map((item, idx) => (
                          <div key={idx} className="space-y-0.5">
                            <div className="flex items-center justify-between text-[11px] print:text-[10px]">
                              <span className="font-semibold text-slate-800 capitalize">
                                {item.cause}
                              </span>
                              <div className="flex items-center gap-1.5 font-mono">
                                <span className="text-slate-500 text-[10px]">
                                  {item.count} {item.count === 1 ? 'report' : 'reports'}
                                </span>
                                <span className="font-bold text-slate-900">
                                  {item.pct}%
                                </span>
                              </div>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-amber-500 h-1.5 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, Math.max(3, item.pct))}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* ========================================================
              PAGE 3: Operational Action Matrix & Jurisdictional Directives
             ======================================================== */}
                <div className="print-break-before space-y-4 print:space-y-2.5">
                  {/* Ranked Hotspots Table */}
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs print:border-slate-300 print:shadow-none print-break-inside-avoid">
                    <div className="p-4 print:p-2.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                          Ranked Heat Hotspots
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Sorted from highest to lowest heat risk.
                        </p>
                      </div>
                      <div className="text-[11px] print:text-[10px] text-slate-500 font-mono bg-slate-50 border border-slate-200 px-2.5 py-1 print:py-0.5 rounded-lg">
                        Active Model: <strong className="text-slate-800">{data.dataQuality?.hotspotRunId ? 'Active' : 'Live Report Run'}</strong>
                      </div>
                    </div>

                    {/* F2: Critical Receptor Alert (one summary line when any critical hotspot has flags) */}
                    {(() => {
                      const criticalWithFlags = (data.receptorFlags || []).filter(
                        (rf) => rf.riskTier === 'critical' && rf.receptors && rf.receptors.length > 0
                      );
                      if (criticalWithFlags.length === 0) return null;
                      return (
                        <div className="mx-4 my-2 p-3 print:p-2 rounded-lg bg-red-50/90 border border-red-200 text-xs print:text-[10px] text-red-900 flex items-center gap-2">
                          <ShieldAlert className="w-4 h-4 print:w-3.5 print:h-3.5 text-red-600 shrink-0" />
                          <span>
                            <strong>High Danger Facility Alert:</strong> {criticalWithFlags.length} critical hotspot(s) overlap school, healthcare, or market/labor areas ({criticalWithFlags.map((c) => c.area).join(', ')}).
                          </span>
                        </div>
                      );
                    })()}

                    {(data.hotspots || []).length === 0 ? (
                      <div className="p-8 text-center bg-slate-50/60 m-4 rounded-xl border border-dashed border-slate-200">
                        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-2.5">
                          <Info className="w-5 h-5 text-slate-600" />
                        </div>
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                          {data.dataQuality?.hotspotEmptyReason === 'no-published-run'
                            ? 'No Active Hotspot Run'
                            : data.dataQuality?.hotspotEmptyReason === 'below-threshold'
                              ? 'Below Hotspot Threshold'
                              : 'No Concentrated Heat Zones'}
                        </h4>
                        <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed">
                          {data.dataQuality?.hotspotEmptyReason === 'no-published-run'
                            ? 'No hotspot models have been published for these cities in this window yet. Reports below are shown individually.'
                            : data.dataQuality?.hotspotEmptyReason === 'below-threshold'
                              ? 'No areas exceeded the heat clustering threshold — reports did not reach extreme cluster levels.'
                              : 'No concentrated heat zones recorded for this scope in the selected observation window.'}
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-700 print-compact-table">
                          <thead className="bg-slate-50/80 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200">
                            <tr>
                              <th className="py-2.5 px-3">#</th>
                              <th className="py-2.5 px-3 whitespace-nowrap">Zone Code</th>
                              <th className="py-2.5 px-3">Area &amp; City</th>
                              <th className="py-2.5 px-3">TVI Score (0–1)</th>
                              <th className="py-2.5 px-3">Risk Level</th>
                              <th className="py-2.5 px-3">Nearby Places</th>
                              <th className="py-2.5 px-3">Confirmed Reports</th>
                              <th className="py-2.5 px-3">Highest Temp</th>
                              <th className="py-2.5 px-3">Heat Index</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(data.hotspots || []).map((h, i) => {
                              const tier = h.riskTier || 'unknown';
                              const receptors = receptorMap.get(String(h.id || h.clusterId)) || receptorMap.get(String(h.area || '').toLowerCase()) || [];
                              return (
                                <tr key={h.id || h._id || `${h.clusterId || 'hs'}-${i}`} className="group hover:bg-slate-50/60 transition-colors">
                                  <td className="py-2.5 px-3 font-mono font-bold text-slate-400">{i + 1}</td>
                                  <td className="py-2.5 px-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                                    <span
                                      className="inline-block whitespace-nowrap px-2 py-0.5 rounded bg-slate-100 border border-slate-200/80 font-bold text-[11px] print:text-[10px] font-mono tracking-tight"
                                      title={`Internal Cluster: ${h.clusterId || ''} • ${h.city || ''}`}
                                    >
                                      {formatClusterCode(h, scopeMode, i)}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 font-medium text-slate-800">
                                    {formatClusterLocation(h, h.area || h.city, scopeMode)}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                                    {h.tvi != null ? h.tvi.toFixed(2) : (
                                      <span className="text-slate-400 font-normal italic">Unscored</span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${TIER_STYLES[tier] || TIER_STYLES.unknown
                                        }`}
                                    >
                                      {tier}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    {receptors.length === 0 ? (
                                      <span className="text-slate-400 text-[11px]">—</span>
                                    ) : (
                                      <div className="flex flex-wrap gap-1">
                                        {receptors.map((rec) => (
                                          <span
                                            key={rec}
                                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border ${rec === 'school'
                                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                                              : rec === 'health'
                                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                                : 'bg-amber-50 text-amber-700 border-amber-200'
                                              }`}
                                          >
                                            {rec === 'market_labor' ? 'market/labor' : rec}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono">{h.reportCount}</td>
                                  <td className="py-2.5 px-3 font-mono">{h.peakTemp != null ? `${h.peakTemp}°C` : '—'}</td>
                                  <td className="py-2.5 px-3 font-mono font-medium text-slate-900">
                                    {resolveHeatIndex(h) != null ? `${resolveHeatIndex(h)}°C` : '—'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* F2: Honesty Caption */}
                    <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] print:text-[9.5px] text-slate-500 italic">
                      <span>Nearby places are identified from descriptions in citizen reports.</span>
                    </div>
                  </div>

                  {/* Automated Hotspot Action & Advisory Dossiers */}
                  {(data.hotspots || []).length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 p-4 print:p-2.5 shadow-2xs print:shadow-none print:border-slate-300 space-y-3 print:space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                            Detailed Area Summaries &amp; Safety Instructions
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            Clear action guidelines for city teams and public safety advice for each active heat zone.
                          </p>
                        </div>
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100/70 text-emerald-800 border border-emerald-300">
                          {data.hotspots.length} Active {data.hotspots.length === 1 ? 'Heat Zone' : 'Heat Zones'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 dossier-grid print-grid-2 gap-4 print:gap-2.5">
                        {data.hotspots.map((h, i) => (
                          <div
                            key={h.id || h._id || `${h.clusterId || 'hs'}-${i}`}
                            id={`dossier-${h.clusterId || i}`}
                            className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-2xs print:shadow-none print:border-slate-300 print-break-inside-avoid"
                          >
                            <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between flex-wrap gap-2 print:py-1.5 print:px-2.5">
                              <div className="flex items-center gap-2">
                                <span
                                  className="text-xs print:text-[11px] font-mono font-bold text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-2xs whitespace-nowrap shrink-0"
                                  title={`Internal Cluster: ${h.clusterId || ''} • ${h.city || ''}`}
                                >
                                  {formatClusterCode(h, scopeMode, i)}
                                </span>
                                <span className="text-xs print:text-[11px] font-bold text-slate-800 truncate">
                                  {formatClusterLocation(h, 'Cluster Zone', scopeMode)}
                                </span>
                              </div>
                            </div>
                            <div className="p-3 print:p-2">
                              <HotspotDetailPanel hotspot={{ ...h, heatIndexMean: resolveHeatIndex(h) }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Unified Operational Municipal Heat Action Plan */}
                  {synthesizedPlan.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs print:border-slate-300 print:shadow-none space-y-0 print-break-inside-avoid">
                      <div className="p-4 py-2.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h3 className="text-slate-900 text-xs font-bold flex items-center gap-2">
                            <Activity className="w-4 h-4 text-emerald-600" />
                            City Heat Action Plan
                          </h3>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Step-by-step actions for municipal teams, emergency workers, and health departments.
                          </p>
                        </div>
                        <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                          {synthesizedPlan.length} Action {synthesizedPlan.length === 1 ? 'Step' : 'Steps'}
                        </span>
                      </div>

                      {/* Action Plan Cards */}
                      <div className="p-4 print:p-2.5">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 print-grid-3 print:grid-cols-3 gap-3.5 print:gap-2">
                          {synthesizedPlan.map((action, idx) => {
                            const cfg = PHASE_CONFIG[action.phaseNumber] || PHASE_CONFIG[1];
                            return (
                              <div
                                key={action.id || idx}
                                className={`rounded-xl border border-slate-200 bg-white p-3.5 print:p-2.5 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between space-y-2.5 print:space-y-1.5 border-l-4 ${cfg.border} print:border-slate-300`}
                              >
                                <div className="space-y-2 print:space-y-1">
                                  {/* Phase Pill + Urgency */}
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${cfg.badge}`}>
                                        {cfg.short}
                                      </span>
                                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${action.urgencyStyle}`}>
                                        {action.urgency}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Lead Agency */}
                                  <div className="flex items-center gap-1.5 text-[11px] print:text-[10px] font-medium text-slate-700">
                                    <span className="text-slate-400 font-normal">Assigned Team:</span>
                                    <span className="font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded truncate max-w-52.5" title={action.leadAgency}>
                                      {action.leadAgency}
                                    </span>
                                  </div>

                                  {/* Title & Directive Text */}
                                  <div>
                                    <h4 className="text-xs font-bold text-slate-900 leading-snug">
                                      {action.title}
                                    </h4>
                                    <p className="text-[11.5px] print:text-[10.5px] text-slate-600 mt-1 print:mt-0.5 leading-relaxed">
                                      {action.text}
                                    </p>
                                  </div>
                                </div>

                                {/* Geographic Target Locations & Timing */}
                                <div className="pt-2 border-t border-slate-100 text-[11px] print:text-[10px]">
                                  <div className="flex items-center justify-between text-slate-700 mb-1">
                                    <span className="flex items-center gap-1 font-bold">
                                      <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                      Target Areas ({action.hotspotCount}):
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {action.timeline}
                                    </span>
                                  </div>
                                  {action.targetLocations.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {action.targetLocations.map((loc, lIdx) => (
                                        <span
                                          key={lIdx}
                                          className="inline-flex items-center gap-1 text-[10px] print:text-[9px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 whitespace-nowrap"
                                        >
                                          <span>{loc.area}</span>
                                          <span className="font-mono text-slate-500 text-[9px] whitespace-nowrap">
                                            ({loc.clusterId})
                                          </span>
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic">
                                      Applies across all monitored areas.
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Operational Guidance Footnote */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] print:text-[9.5px] text-slate-500">
                          <span className="flex items-center gap-1.5">
                            <Info className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Actions are prioritized by heat severity and population density. Cost estimates are provided for planning.</span>
                          </span>
                          {data.dangerWindow && data.dangerWindow.window && (
                            <span className="font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 shrink-0">
                              Peak Danger Hours: {data.dangerWindow.window} (Pause outdoor labor)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Data Quality & Governance Footnote */}
                  <div className="bg-slate-50/80 rounded-xl border border-slate-200 p-3.5 print:p-2 text-[11px] print:text-[9.5px] text-slate-500 space-y-1.5 print:space-y-1 print:border-slate-300 print-break-inside-avoid">
                    <div className="flex items-center gap-1.5 font-bold text-slate-700">
                      <Info className="w-3.5 h-3.5 text-slate-400" />
                      <span>Data Summary &amp; Verification Notes</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 print-grid-5 print:grid-cols-5 gap-2 pt-1 border-t border-slate-200/60">
                      <div>
                        <span className="text-slate-400">Report ID:</span>{' '}
                        <strong className="text-slate-700 font-mono">{data.scope?.briefRef || 'HTX-BRIEF'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Total Reports:</span>{' '}
                        <strong className="text-slate-700">{data.dataQuality?.verifiedCount ?? 0} verified</strong> of{' '}
                        {data.dataQuality?.reportCount ?? 0} total ({data.dataQuality?.flaggedCount ?? 0} spam or duplicate removed)
                      </div>
                      <div>
                        <span className="text-slate-400">Time Period:</span>{' '}
                        <strong className="text-slate-700">{data.scope?.days || days} days</strong> ({formatDate(data.scope?.from)} — {formatDate(data.scope?.to)})
                      </div>
                      <div>
                        <span className="text-slate-400">Data Quality:</span>{' '}
                        <strong className="text-slate-700">100% Verified Citizen Reports</strong> (Quality Checked)
                      </div>
                      <div>
                        <span className="text-slate-400">Analysis Run:</span>{' '}
                        <strong className="text-slate-700 font-mono">{data.dataQuality?.hotspotRunId || 'Current'}</strong>
                      </div>
                    </div>
                    <p className="text-[10px] print:text-[9px] text-slate-400 pt-0.5 italic">
                      Comparison is based on {data.baseline?.cityReportCount ?? 0} verified reports across {data.scope?.province || data.scope?.city} during the same time period.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
          );
}
