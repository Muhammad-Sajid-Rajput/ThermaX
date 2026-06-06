import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  RefreshCw,
  LayoutDashboard,
  Map,
  Flame,
  AlertCircle,
  CheckCircle,
  Clock,
  Filter,
  ShieldCheck,
  Globe,
  CheckCircle2,
  Layers,
  Activity,
  MapPin,
  Zap,
  Settings,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import KpiCards from '../../components/dashboard/KpiCards';
import MapSection from '../../components/dashboard/MapSection';
import AnalyticsSection from '../../components/dashboard/AnalyticsSection';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '../../components/ui/Card';
import { fetchDashboardSnapshot } from '../../services/api.js';
import toast from 'react-hot-toast';
import LiveWeatherCard from '../../components/weather/LiveWeatherCard';
// ─── View navigation config ────────────────────────────────────────────────
const VIEWS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'heatmap', label: 'Heat Map', icon: Map },
  { id: 'hotspots', label: 'Hotspots', icon: Flame },
  { id: 'settings', label: 'Settings', icon: Settings },
];
// ─── Status badge helpers ──────────────────────────────────────────────────
const STATUS_ICONS = {
  Validated: CheckCircle,
  'Pending review': Clock,
};
const STATUS_COLORS = {
  Validated: 'text-green-600 bg-green-50 border-green-200',
  'Pending review': 'text-amber-600 bg-amber-50 border-amber-200',
};
const SEVERITY_BG = {
  5: 'bg-red-500',
  4: 'bg-orange-400',
  3: 'bg-yellow-400',
  2: 'bg-green-500',
  1: 'bg-slate-400',
};
// ─── Loading skeleton ──────────────────────────────────────────────────────
const SkeletonPulse = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200 rounded-xl ${className}`} />
);
const LoadingSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <SkeletonPulse key={i} className="h-28" />
      ))}
    </div>
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      <SkeletonPulse className="xl:col-span-8 h-96" />
      <div className="xl:col-span-4 space-y-4">
        <SkeletonPulse className="h-44" />
        <SkeletonPulse className="h-44" />
      </div>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <SkeletonPulse className="h-48" />
      <SkeletonPulse className="h-48" />
      <SkeletonPulse className="h-48" />
    </div>
  </div>
);
// ─── Main dashboard ────────────────────────────────────────────────────────
const SaaSDashboard = () => {
  const [currentView, setCurrentView] = useState('overview');
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    range: '7d',
    severity: 'all',
    area: 'all',
  });
  const [displayPrefs, setDisplayPrefs] = useState({
    showKpis: true,
    showHotspots: true,
    showMarkers: true,
    animations: true,
    realTime: true,
  });
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  // Auth-aware report navigation
  const handleReportHeatClick = () => {
    if (isAuthenticated) {
      navigate('/report');
    } else {
      navigate('/login', { state: { from: '/report' } });
    }
  };
  const loadSnapshot = useCallback(
    async (showRefreshing = false) => {
      try {
        if (showRefreshing) setRefreshing(true);
        else setLoading(true);
        setError(null);
        const data = await fetchDashboardSnapshot(filters);
        setSnapshot(data);
      } catch (err) {
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filters]
  );
  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);
  // ── Page meta helpers ──────────────────────────────────────────────────
  const getViewMeta = (view) => {
    switch (view) {
      case 'heatmap':
        return {
          title: 'Heat Map View',
          desc: 'Interactive heatmap visualization across Karachi districts',
        };
      case 'hotspots':
        return {
          title: 'Hotspot Analysis',
          desc: 'Identified heat hotspot clusters and severity distribution',
        };
      case 'settings':
        return {
          title: 'Dashboard Settings',
          desc: 'Configure preferences and data visualization options',
        };
      default:
        return {
          title: 'Urban Heat Intelligence',
          desc: 'Real-time monitoring of urban heat islands across Karachi',
        };
    }
  };
  const { title, desc } = getViewMeta(currentView);
  // ── Error state ─────────────────────────────────────────────────────────
  if (error && !snapshot) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">
            Dashboard Unavailable
          </h2>
          <p className="text-sm text-slate-500">{error}</p>
        </div>
        <button
          onClick={() => loadSnapshot()}
          className="theme-btn-primary px-5 py-2 rounded-lg text-sm font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            {title}
          </h1>
          <p className="text-slate-500 mt-1 text-sm sm:text-base leading-snug max-w-xl">
            {desc}
          </p>
          {snapshot?.lastUpdated && (
            <p className="text-xs text-slate-400 mt-1">
              Last updated:{''}
              {new Intl.DateTimeFormat('en-PK', {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(new Date(snapshot.lastUpdated))}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* Refresh */}
          <button
            onClick={() => loadSnapshot(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw
              className={`w-4 h-4 text-slate-500 ${refreshing ? 'animate-spin' : ''}`}
            />
            <span className="hidden sm:inline text-slate-600">Refresh</span>
          </button>
          {/* Submit Report */}
          <button
            onClick={handleReportHeatClick}
            className="theme-btn-primary flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            Report Heat
          </button>
          {/* Live indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Live
          </div>
        </div>
      </div>
      <LiveWeatherCard />

      {/* View Navigation Tabs */}
      <div className="flex items-center justify-center gap-1 flex-wrap">
        {VIEWS.map((view) => {
          const Icon = view.icon;
          const isActive = currentView === view.id;
          return (
            <button
              key={view.id}
              onClick={() => setCurrentView(view.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-green-600 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {view.label}
            </button>
          );
        })}
      </div>

            {/* ── Loading ────────────────────────────────────────────────────── */}
      {loading ? (
        <LoadingSkeleton />
      ) : (
        <>
          {/* ══ OVERVIEW ═══════════════════════════════════════════════ */}
          {currentView === 'overview' && (
            <div className="space-y-6">
              {/* KPI Row */}
              {displayPrefs.showKpis && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <KpiCards kpis={snapshot?.kpis ?? []} />
                </div>
              )}

              {/* Map + Recommendations */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Map */}
                <div className="lg:col-span-2 h-[60vh] lg:h-[75vh] min-h-125 flex flex-col overflow-hidden">
                  <MapSection
                    heatmap={snapshot?.heatmap ?? []}
                    reports={snapshot?.reports ?? []}
                    showHotspots={displayPrefs.showHotspots}
                    showMarkers={displayPrefs.showMarkers}
                  />
                </div>
                {/* Recommendations panel */}
                <div className="lg:col-span-1 h-[60vh] lg:h-[75vh] min-h-125 flex flex-col gap-6 overflow-hidden">
                  <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <CardHeader className="pb-3 border-b border-slate-100">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Flame className="w-4 h-4 text-red-500" />
                        Priority Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3 flex-1 overflow-y-auto min-h-0">
                      {(snapshot?.recommendations ?? []).map((rec) => {
                        const priorityColor =
                          {
                            Critical: 'border-l-red-500 bg-red-50',
                            High: 'border-l-orange-500 bg-orange-50',
                            Medium: 'border-l-amber-400 bg-amber-50',
                            Low: 'border-l-green-500 bg-green-50',
                          }[rec.priority] ?? 'border-l-slate-400 bg-slate-50';
                        return (
                          <div
                            key={rec.id}
                            className={`border-l-4 rounded-r-xl p-3 ${priorityColor}`}
                          >
                            <div className="flex justify-between items-start mb-1.5">
                              <span className="text-xs font-bold text-slate-800 leading-tight">
                                {rec.area}
                              </span>
                              <span className="text-[10px] font-semibold text-slate-500 shrink-0 ml-2">
                                {rec.id}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 leading-snug">
                              {rec.action}
                            </p>
                          </div>
                        );
                      })}
                      {!snapshot?.recommendations?.length && (
                        <p className="text-sm text-slate-400 text-center py-4">
                          No recommendations available.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                  {/* Report stats */}
                  <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <CardHeader className="pb-3 border-b border-slate-100">
                      <CardTitle className="text-sm font-semibold">
                        Recent Reports
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3 flex-1 overflow-y-auto min-h-0">
                      {(snapshot?.reports ?? []).slice(0, 5).map((rpt) => {
                        const StatusIcon = STATUS_ICONS[rpt.status] ?? Clock;
                        return (
                          <div
                            key={rpt.id}
                            className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0 last:pb-0"
                          >
                            <div
                              className={`mt-0.5 w-3 h-3 rounded-full shrink-0 ${SEVERITY_BG[rpt.severity] ?? 'bg-slate-400'}`}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-800 truncate leading-tight">
                                {rpt.area}
                              </p>
                              <p className="text-xs text-slate-500 truncate mt-0.5">
                                {rpt.category}
                              </p>
                            </div>
                            <span
                              className={`text-[10px] font-medium px-2 py-1 rounded-md border ${STATUS_COLORS[rpt.status] ?? 'text-slate-500 bg-slate-50 border-slate-200'}`}
                            >
                              S{rpt.severity}
                            </span>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                </div>
              </div>
              {/* Analytics Charts */}
              <AnalyticsSection
                charts={snapshot?.charts ?? {}}
                onFilterChange={(type, value) => {
                  if (type === 'severity') {
                    setFilters((f) => ({ ...f, severity: value }));
                  } else if (type === 'date') {
                    setFilters((f) => ({ ...f, range: '24h' }));
                  }
                  toast.success(`Filtered by ${type}: ${value}`);
                  loadSnapshot(true);
                }}
              />
            </div>
          )}
          {/* ══ HEATMAP VIEW ══════════════════════════════════════════ */}
          {currentView === 'heatmap' && (
            <div className="h-[75vh] min-h-125 w-full flex flex-col overflow-hidden">
              <MapSection
                heatmap={snapshot?.heatmap ?? []}
                reports={snapshot?.reports ?? []}
                focus="heatmap"
                hideControls={true}
                title="District Heat Intensity"
              />
            </div>
          )}
          {/* ══ HOTSPOTS VIEW ═════════════════════════════════════════ */}
          {currentView === 'hotspots' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              <div className="xl:col-span-8 h-[60vh] xl:h-[75vh] min-h-125 flex flex-col">
                <MapSection
                  heatmap={snapshot?.heatmap ?? []}
                  reports={snapshot?.reports ?? []}
                  focus="hotspots"
                  hideControls={true}
                  title="Hotspot Analytics Map"
                />
              </div>
              <div className="xl:col-span-4 h-[60vh] xl:h-[75vh] min-h-125 grid grid-cols-2 gap-4 pr-2 content-start">
                {(snapshot?.hotspots ?? []).map((hs) => {
                  const color =
                    {
                      Critical: '#dc2626',
                      High: '#f97316',
                      Medium: '#facc15',
                      Low: '#65a30d',
                    }[hs.priority] ?? '#0f766e';
                  return (
                    <Card key={hs.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-sm font-bold text-slate-900">
                              {hs.area}
                            </p>
                            <p className="text-xs text-slate-500">
                              {hs.clusterId}
                            </p>
                          </div>
                          <span
                            className="text-[11px] font-semibold px-2 py-1 rounded-full"
                            style={{ background: color + '22', color }}
                          >
                            {hs.priority}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          {[
                            ['Temp', `${hs.avgTemperature}°C`],
                            ['Severity', hs.avgSeverity.toFixed(1)],
                            ['Reports', hs.reportCount],
                          ].map(([label, val]) => (
                            <div
                              key={label}
                              className="bg-slate-50 rounded-lg py-1.5"
                            >
                              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                                {label}
                              </p>
                              <p className="text-sm font-bold text-slate-800">
                                {val}
                              </p>
                            </div>
                          ))}
                        </div>
                        {/* NDVI */}
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-slate-500 mb-0.5">
                            <span>NDVI (Vegetation)</span>
                            <span className="font-medium">
                              {(hs.ndvi * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-green-500"
                              style={{ width: `${hs.ndvi * 100}%` }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
          {/* ══ SETTINGS VIEW ═════════════════════════════════════════ */}
          {currentView === 'settings' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900">
                  Dashboard Settings
                </h2>
                <p className="text-slate-500">
                  Configure your data preferences and interface display options.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Data Filters */}
                <Card className="border-none shadow-sm overflow-hidden">
                  <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-green-600" />
                      <CardTitle className="text-base">
                        Data Intelligence Filters
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-5">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <label className="text-sm font-semibold text-slate-700">
                          Analysis Time Range
                        </label>
                      </div>
                      <select
                        value={filters.range}
                        onChange={(e) =>
                          setFilters((f) => ({ ...f, range: e.target.value }))
                        }
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all outline-none"
                      >
                        <option value="24h">Past 24 hours (Real-time)</option>
                        <option value="7d">Past 7 days (Weekly Trend)</option>
                        <option value="30d">
                          Past 30 days (Monthly Analysis)
                        </option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                        <label className="text-sm font-semibold text-slate-700">
                          Minimum Severity Threshold
                        </label>
                      </div>
                      <select
                        value={filters.severity}
                        onChange={(e) =>
                          setFilters((f) => ({
                            ...f,
                            severity: e.target.value,
                          }))
                        }
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all outline-none"
                      >
                        <option value="all">All levels (Comprehensive)</option>
                        <option value="2">S2 and above (Noticeable)</option>
                        <option value="3">S3 and above (Significant)</option>
                        <option value="4">S4 and above (Severe)</option>
                        <option value="5">S5 only (Extreme Emergency)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-1">
                        <Globe className="w-3.5 h-3.5 text-slate-400" />
                        <label className="text-sm font-semibold text-slate-700">
                          Geographic Focus
                        </label>
                      </div>
                      <select
                        value={filters.area}
                        onChange={(e) =>
                          setFilters((f) => ({ ...f, area: e.target.value }))
                        }
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all outline-none"
                      >
                        <option value="all">Entire Karachi Region</option>
                        {(snapshot?.availableAreas ?? []).map((a) => (
                          <option key={a} value={a}>
                            {a}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={() => {
                        loadSnapshot(true);
                        setCurrentView('overview');
                      }}
                      className="w-full flex items-center justify-center gap-2 theme-btn-primary py-3 rounded-xl text-sm font-bold shadow-lg shadow-green-500/10 hover:shadow-green-500/20 transition-all mt-4"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Update Dashboard View
                    </button>
                  </CardContent>
                </Card>

                {/* Display Preferences */}
                <Card className="border-none shadow-sm overflow-hidden">
                  <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-green-600" />
                      <CardTitle className="text-base">
                        Interface Customization
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-1">
                      {[
                        {
                          id: 'showKpis',
                          label: 'Summary KPI Cards',
                          desc: 'Display top-level metrics',
                          icon: Activity,
                        },
                        {
                          id: 'showHotspots',
                          label: 'Cluster Visualizations',
                          desc: 'Show identified hotspots',
                          icon: Flame,
                        },
                        {
                          id: 'showMarkers',
                          label: 'Detailed Report Markers',
                          desc: 'Show individual user reports',
                          icon: MapPin,
                        },
                        {
                          id: 'animations',
                          label: 'Interactive Animations',
                          desc: 'Smooth transitions and effects',
                          icon: RefreshCw,
                        },
                        {
                          id: 'realTime',
                          label: 'Live Data Polling',
                          desc: 'Auto-refresh every 5 minutes',
                          icon: Zap,
                        },
                      ].map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-green-600 group-hover:border-green-100 transition-colors shadow-sm">
                              <item.icon className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-700">
                                {item.label}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {item.desc}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              setDisplayPrefs((prev) => ({
                                ...prev,
                                [item.id]: !prev[item.id],
                              }))
                            }
                            className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${displayPrefs[item.id] ? 'bg-green-600' : 'bg-slate-200'}`}
                          >
                            <span
                              aria-hidden="true"
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${displayPrefs[item.id] ? 'translate-x-5' : 'translate-x-0'}`}
                            />
                          </button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-green-600 border-none shadow-lg shadow-green-600/20 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                  <ShieldCheck className="w-32 h-32 text-white" />
                </div>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="text-white">
                      <h3 className="text-lg font-bold">
                        Data Privacy &amp; Sync
                      </h3>
                      <p className="text-green-100 text-sm max-w-md mt-1">
                        Your dashboard preferences are saved locally for this
                        session. Critical alerts are always prioritized
                        regardless of display settings.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-semibold transition-colors border border-white/20">
                        Reset Defaults
                      </button>
                      <button
                        onClick={() => setCurrentView('overview')}
                        className="px-4 py-2 bg-white text-green-700 hover:bg-green-50 rounded-lg text-sm font-bold transition-colors shadow-sm"
                      >
                        Back to Dashboard
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
};
export default SaaSDashboard;
