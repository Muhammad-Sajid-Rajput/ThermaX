import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import {
  TrendingUp,
  TrendingDown,
  Minus,
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
  FileSpreadsheet,
  FileCode,
  Layers,
  Activity,
  Thermometer,
  Sparkles,
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
import { fetchInsights, downloadInsightsCsv, searchNominatimLocations } from '../../services/api';
import HotspotDetailPanel from '../../components/admin/HotspotDetailPanel';
import AnalyticsSection from '../../components/dashboard/AnalyticsSection';

const TIER_STYLES = {
  critical: 'bg-red-50 text-red-700 border-red-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  moderate: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  unknown: 'bg-slate-100 text-slate-600 border-slate-200',
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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

  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [downloadingJson, setDownloadingJson] = useState(false);

  const loadData = useCallback(async (mode, city, province, currentDays) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        days: currentDays,
        includeSynthetic: true,
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

  const handleDownloadCsv = async () => {
    if (!data) return;
    setDownloadingCsv(true);
    try {
      const blob = await downloadInsightsCsv({
        province: data.scope.province || selectedProvince,
        city: data.scope.city || selectedCity,
        area: data.scope.area,
        days: data.scope.days,
        includeSynthetic: true,
      });
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a');
      link.href = url;
      const slug = (data.scope.city || data.scope.province || selectedCity).toLowerCase().replace(/[^a-z0-9]+/g, '-');
      link.setAttribute('download', `insights-${slug}-${data.scope.days}d.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('CSV export downloaded');
    } catch (err) {
      console.error('CSV export failed:', err);
      toast.error('Failed to export CSV');
    } finally {
      setDownloadingCsv(false);
    }
  };

  const handleDownloadJson = () => {
    if (!data) return;
    setDownloadingJson(true);
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const slug = (data.scope.city || data.scope.province || selectedCity).toLowerCase().replace(/[^a-z0-9]+/g, '-');
      link.setAttribute('download', `insights-${slug}-${data.scope.days}d.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('JSON export downloaded');
    } catch (err) {
      console.error('JSON export failed:', err);
      toast.error('Failed to export JSON');
    } finally {
      setDownloadingJson(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const toggleHotspot = (clusterId) => {
    setExpandedHotspotId((prev) => (prev === clusterId ? null : clusterId));
  };

  const priorityActions = (data?.hotspots || []).flatMap((hs, hsIdx) =>
    (hs.directives || []).map((d, idx) => {
      const tier = hs.riskTier || 'high';
      const priority = tier.charAt(0).toUpperCase() + tier.slice(1);
      return {
        key: `${hs.id || hs._id || hs.clusterId || 'hs'}-${hsIdx}-${d.id || 'dir'}-${idx}`,
        id: d.id,
        area: `${hs.area || hs.city || data?.scope?.city || 'Area'} Hotspot (${hs.clusterId || 'Zone'})`,
        action: d.text || d.directive || 'Implement targeted cooling measures.',
        priority,
      };
    })
  );

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
      const tier = (h.riskTier || 'moderate').toLowerCase();
      const priority =
        tier === 'critical'
          ? 'Critical'
          : tier === 'high'
          ? 'High'
          : tier === 'low'
          ? 'Low'
          : 'Moderate';

      const score =
        h.tvi != null
          ? Math.round(h.tvi * 100)
          : Math.min(Math.round(((h.heatIndexMean || h.peakTemp || 35) / 55) * 100), 100);

      return {
        area: h.area || h.clusterId || 'Zone',
        growth: Math.max(15, Math.min(score, 100)),
        priority,
      };
    });

    return { trend, severity, hotspotGrowth };
  }, [data]);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto print-full-width">
      {/* Top Banner & Exits Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
              Area Insights & Decision Briefing
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              Verified Aggregates
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Actionable thermal intelligence, risk rankings, and mitigation directives scoped by area.
          </p>
        </div>

        {/* Three Exits (Controls hidden during print) */}
        <div className="flex items-center gap-2 no-print shrink-0">
          <button
            type="button"
            onClick={handleDownloadCsv}
            disabled={loading || downloadingCsv || !data}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
            title="Download structured multi-section CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>{downloadingCsv ? 'Exporting...' : 'Export CSV'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadJson}
            disabled={loading || downloadingJson || !data}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
            title="Download verbatim JSON payload"
          >
            <FileCode className="w-3.5 h-3.5 text-indigo-600" />
            <span>{downloadingJson ? 'Exporting...' : 'Export JSON'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            disabled={loading || !data}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            title="Print or Save PDF"
          >
            <Printer className="w-3.5 h-3.5 text-white" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Scope Controls Bar (Hidden during print) */}
      <div className="no-print bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-4">
        {/* Scope Mode Switcher Tabs */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => handleScopeModeChange('city')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                scopeMode === 'city'
                  ? 'bg-white text-emerald-800 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              City Search
            </button>
            <button
              type="button"
              onClick={() => handleScopeModeChange('province')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                scopeMode === 'province'
                  ? 'bg-white text-emerald-800 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Province Scope
            </button>
          </div>

          <span className="text-[11px] text-slate-400 font-medium">
            {scopeMode === 'city'
              ? 'Search any city across Pakistan for localized thermal intelligence'
              : 'Aggregating province-wide heat stress patterns'}
          </span>
        </div>

        {/* Filter Controls Form */}
        {scopeMode === 'province' ? (
          /* Province Scope: ONLY the list of provinces occurs. Admin selects province -> province report occurs */
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <div className="md:col-span-8">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Target Province
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
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      days === d
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
                  Search City / Town / Village in Pakistan
                </label>
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <Globe className="w-2.5 h-2.5" />
                  Live OpenStreetMap Nominatim
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
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      days === d
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
        <div className="flex flex-wrap items-center gap-2 pt-2 text-xs text-slate-500 border-t border-slate-100">
          <span className="font-semibold text-slate-600">Active Scope:</span>
          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
            {scopeMode === 'city'
              ? `City: ${data?.scope?.city || selectedCity}`
              : `Province: ${data?.scope?.province || selectedProvince} (Province-wide Aggregate)`}
          </span>
          {data?.scope?.province && scopeMode === 'city' && (
            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium">
              {data.scope.province}
            </span>
          )}
          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium">
            Past {data?.scope?.days || days} days
          </span>
          <span className="ml-auto text-[11px] text-slate-400">
            {loading ? 'Refreshing intelligence...' : 'Audit verified • Live sync'}
          </span>
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
          {/* Executive Briefing Takeaways */}
          <div className="bg-linear-to-r from-emerald-50/70 via-teal-50/40 to-slate-50/70 rounded-xl border border-emerald-200/80 p-5 shadow-2xs space-y-3 page-break-avoid">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <Lightbulb className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Executive Briefing Takeaways
                </h2>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100/80 text-emerald-800 border border-emerald-300/60 uppercase tracking-wider">
                Deterministic Findings
              </span>
            </div>

            <ul className="space-y-2 pt-1">
              {data.takeaways.map((takeaway, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-800 leading-relaxed font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                  <span>{takeaway}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Key Metrics / KPI Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 page-break-avoid">
            {/* Total Verified Reports */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Verified Reports</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 font-mono">
                {data.summary.totalReports}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                {data.dataQuality.syntheticExcluded ? 'QC verified only' : 'QC verified reports'}
              </p>
            </div>

            {/* Average Temperature & Delta vs Baseline */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Avg Ambient Temp</span>
                <Thermometer className="w-4 h-4 text-amber-500" />
              </div>
              <div className="flex items-baseline gap-1">
                <p className="text-2xl font-extrabold text-slate-900 font-mono">
                  {data.summary.avgTemp != null ? `${data.summary.avgTemp}°C` : 'N/A'}
                </p>
              </div>
              <div className="mt-1">
                {data.baseline.areaAvgTempDelta != null ? (
                  <span
                    className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${
                      data.baseline.areaAvgTempDelta > 0
                        ? 'text-red-600'
                        : data.baseline.areaAvgTempDelta < 0
                        ? 'text-blue-600'
                        : 'text-slate-600'
                    }`}
                  >
                    {data.baseline.areaAvgTempDelta > 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : data.baseline.areaAvgTempDelta < 0 ? (
                      <TrendingDown className="w-3 h-3" />
                    ) : (
                      <Minus className="w-3 h-3" />
                    )}
                    {data.baseline.areaAvgTempDelta > 0 ? `+${data.baseline.areaAvgTempDelta}` : data.baseline.areaAvgTempDelta}
                    °C vs {data.scope.province || data.scope.city}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">
                    Province baseline: {data.baseline.cityAvgTemp != null ? `${data.baseline.cityAvgTemp}°C` : 'N/A'}
                  </span>
                )}
              </div>
            </div>

            {/* Peak Ambient Temp */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Peak Temp</span>
                <Flame className="w-4 h-4 text-red-500" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 font-mono">
                {data.summary.peakTemp != null ? `${data.summary.peakTemp}°C` : 'N/A'}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                Highest verified reading
              </p>
            </div>

            {/* Active Hotspots */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Active Hotspots</span>
                <Layers className="w-4 h-4 text-indigo-500" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 font-mono">
                {data.summary.activeHotspots}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                Published cluster run
              </p>
            </div>

            {/* Critical Hotspots */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs col-span-2 md:col-span-1">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Critical Hotspots</span>
                <ShieldAlert className="w-4 h-4 text-red-600" />
              </div>
              <p className="text-2xl font-extrabold text-red-600 font-mono">
                {data.summary.criticalHotspots}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                Tier: critical risk
              </p>
            </div>
          </div>

          {/* Area Analytics Overview Cards (Report Trend, Severity Mix, Area Heat Index) */}
          <div className="page-break-avoid">
            <AnalyticsSection
              charts={analyticsCharts}
              days={data.scope.days}
            />
          </div>

          {/* Ambient Temperature Trajectory */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs page-break-avoid">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Ambient Temperature Trajectory ({data.scope.days} Days)
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {formatDate(data.scope.from)} — {formatDate(data.scope.to)}
              </span>
            </div>

            {!data.dataQuality.trendEligible ? (
              // Honest Insufficient Data State
              <div className="my-auto py-12 px-6 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200">
                <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-3">
                  <Info className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 mb-1">
                  Temporal Trends Withheld
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  This scope has <strong className="text-slate-700">{data.dataQuality.verifiedCount} verified reports</strong>.
                  Trend curves require a minimum of <strong className="text-slate-700">{data.dataQuality.minReportsForTrend} verified reports</strong> in
                  the window to prevent drawing misleading trajectory conclusions from sparse data.
                </p>
              </div>
            ) : (
              <div>
                <div className="h-52 w-full min-w-0">
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
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                    Daily Average Ambient Temperature Reading
                  </span>
                  {data.baseline.areaAvgTempDelta != null && (
                    <span className="text-[11px] font-medium text-slate-600">
                      Delta vs {data.scope.province || data.scope.city} baseline:{' '}
                      <strong className={data.baseline.areaAvgTempDelta > 0 ? 'text-red-600' : 'text-blue-600'}>
                        {data.baseline.areaAvgTempDelta > 0 ? `+${data.baseline.areaAvgTempDelta}` : data.baseline.areaAvgTempDelta}°C
                      </strong>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Ranked Hotspots Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs page-break-avoid">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Ranked Thermal Hotspots
                </h3>
                <p className="text-[11px] text-slate-500">
                  Ranked by Thermal Vulnerability Index (TVI). Current published run only.
                </p>
              </div>
              <div className="text-[11px] text-slate-500 font-mono bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                Run ID: <strong className="text-slate-800">{data.dataQuality.hotspotRunId || 'None'}</strong>
              </div>
            </div>

            {data.hotspots.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs italic">
                No published hotspots recorded for this scope.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50/80 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Cluster ID</th>
                      <th className="py-2.5 px-3">Area / District</th>
                      <th className="py-2.5 px-3">TVI Score</th>
                      <th className="py-2.5 px-3">Risk Tier</th>
                      <th className="py-2.5 px-3">Reports</th>
                      <th className="py-2.5 px-3">Peak Temp</th>
                      <th className="py-2.5 px-3">Mean Heat Index</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.hotspots.map((h, i) => {
                      const isExpanded = expandedHotspotId === h.clusterId;
                      const tier = h.riskTier || 'unknown';
                      return (
                        <tr key={h.id || h._id || `${h.clusterId || 'hs'}-${i}`} className="group hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-400">{i + 1}</td>
                          <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">{h.clusterId}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-800">{h.area}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                            {h.tvi != null ? h.tvi.toFixed(2) : (
                              <span className="text-slate-400 font-normal italic">Unscored</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${
                                TIER_STYLES[tier] || TIER_STYLES.unknown
                              }`}
                            >
                              {tier}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono">{h.reportCount}</td>
                          <td className="py-2.5 px-3 font-mono">{h.peakTemp != null ? `${h.peakTemp}°C` : '—'}</td>
                          <td className="py-2.5 px-3 font-mono">{h.heatIndexMean != null ? `${h.heatIndexMean}°C` : '—'}</td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => toggleHotspot(h.clusterId)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 p-1 rounded hover:bg-emerald-50 cursor-pointer"
                            >
                              <span>{isExpanded ? 'Hide' : 'Inspect'}</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Expanded Hotspot Detail Drawer */}
            {expandedHotspotId && (
              <div className="p-4 bg-slate-50/90 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700">
                    Detailed Inspection: {expandedHotspotId}
                  </span>
                  <button
                    type="button"
                    onClick={() => setExpandedHotspotId(null)}
                    className="text-xs text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
                  >
                    Close
                  </button>
                </div>
                {(() => {
                  const h = data.hotspots.find((x) => x.clusterId === expandedHotspotId);
                  return h ? <HotspotDetailPanel hotspot={h} /> : null;
                })()}
              </div>
            )}
          </div>

          {/* Priority Actions & Mitigation Directives */}
          {((data.topDirectives && data.topDirectives.length > 0) || priorityActions.length > 0) && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs page-break-avoid">
              <div className="p-5 pb-3 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-slate-900 text-sm font-semibold flex items-center gap-2">
                  <Flame className="w-4 h-4 text-red-500" />
                  Priority Actions & Mitigation Directives
                </h3>
                <span className="text-[11px] text-slate-400 font-medium">
                  {(data.topDirectives?.length || priorityActions.length)} tactical action {(data.topDirectives?.length || priorityActions.length) === 1 ? 'item' : 'items'} for local responders
                </span>
              </div>
              <div className="p-5 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(data.topDirectives && data.topDirectives.length > 0
                    ? data.topDirectives
                    : priorityActions
                  ).map((rec, idx) => (
                    <div
                      key={rec.key || `${rec.id || 'dir'}-${idx}`}
                      className="border-l-4 rounded-r-xl p-3.5 shadow-2xs border-l-orange-500 bg-orange-50/70"
                    >
                      <div className="flex justify-between items-start mb-1.5">
                        <span className="text-xs font-bold text-slate-800 leading-tight">
                          {rec.area || (rec.hotspotCount ? `Applies to ${rec.hotspotCount} ${rec.hotspotCount === 1 ? 'hotspot' : 'hotspots'}` : 'Tactical Directive')}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500 shrink-0 ml-2 font-mono">
                          {rec.id}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-snug">
                        {rec.text || rec.action}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Data Quality & Governance Footnote */}
          <div className="bg-slate-50/80 rounded-xl border border-slate-200 p-4 text-[11px] text-slate-500 space-y-2 page-break-avoid">
            <div className="flex items-center gap-1.5 font-bold text-slate-700">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>Data Quality Assurance & Methodology Footnote</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1 border-t border-slate-200/60">
              <div>
                <span className="text-slate-400">Sample Size:</span>{' '}
                <strong className="text-slate-700">{data.dataQuality.verifiedCount} verified</strong> of{' '}
                {data.dataQuality.reportCount} total ({data.dataQuality.flaggedCount} flagged excluded)
              </div>
              <div>
                <span className="text-slate-400">Time Window:</span>{' '}
                <strong className="text-slate-700">{data.scope.days} days</strong> ({formatDate(data.scope.from)} — {formatDate(data.scope.to)})
              </div>
              <div>
                <span className="text-slate-400">Synthetic Reports:</span>{' '}
                <strong className="text-slate-700">Excluded</strong> (QC authentic citizen data only)
              </div>
              <div>
                <span className="text-slate-400">Published Hotspot Run:</span>{' '}
                <strong className="text-slate-700 font-mono">{data.dataQuality.hotspotRunId || 'None'}</strong>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 pt-1 italic">
              Baseline comparison is computed against {data.baseline.cityReportCount} verified reports across {data.scope.province || data.scope.city} over the identical time window.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
