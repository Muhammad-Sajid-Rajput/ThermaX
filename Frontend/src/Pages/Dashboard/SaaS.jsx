import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  AlertCircle,
  Flame,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import KpiCards from '../../components/dashboard/KpiCards';
import MapSection from '../../components/dashboard/MapSection';
import {
  fetchDashboardSnapshot,
  fetchHotspots,
  fetchHeatmap,
  fetchReports,
} from '../../services/api.js';
import LiveWeatherCard from '../../components/weather/LiveWeatherCard';
import AdvisoryBanner from '../../components/advisory/AdvisoryBanner';

const PRIORITY_BORDER = {
  Critical: 'border-l-red-500 bg-red-50',
  High: 'border-l-orange-500 bg-orange-50',
  Moderate: 'border-l-amber-500 bg-amber-50',
  Medium: 'border-l-amber-500 bg-amber-50',
  Low: 'border-l-yellow-500 bg-yellow-50',
  Unknown: 'border-l-slate-400 bg-slate-50',
};
const PRIORITY_PILL = {
  Critical: 'bg-red-100 text-red-800',
  High: 'bg-orange-100 text-orange-800',
  Moderate: 'bg-amber-100 text-amber-800',
  Medium: 'bg-amber-100 text-amber-800',
  Low: 'bg-yellow-100 text-yellow-800',
  Unknown: 'bg-slate-100 text-slate-700',
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
  </div>
);
// ─── Main dashboard ────────────────────────────────────────────────────────
const SaaSDashboard = () => {
  const [snapshot, setSnapshot] = useState(null);
  const [hotspots, setHotspots] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [filters] = useState({
    range: '7d',
    severity: 'all',
    area: 'all',
  });
  const displayPrefs = {
    showKpis: true,
    showHotspots: true,
    showMarkers: true,
  };
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
        const [snapshotData, hsData, hmData, rptsData] = await Promise.all([
          fetchDashboardSnapshot(filters).catch(() => null),
          fetchHotspots().catch(() => ({ data: [] })),
          fetchHeatmap().catch(() => ({ data: [] })),
          fetchReports().catch(() => ({ data: [] })),
        ]);
        if (!snapshotData) {
          throw new Error('Failed to load dashboard data');
        }
        setSnapshot(snapshotData);
        setHotspots(hsData?.data || []);
        setHeatmap(hmData?.data || []);
        setReports(rptsData?.data || []);
      } catch {
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
  const title = 'Urban Heat Intelligence';
  const desc = 'Real-time monitoring of urban heat islands across Pakistan';
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
          {/* Submit Report */}
          <button
            onClick={handleReportHeatClick}
            className="theme-btn-primary flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            Report Heat
          </button>
        </div>
      </div>
      <LiveWeatherCard />
      {/* ── Loading ────────────────────────────────────────────────────── */}
      {loading ? (
        <LoadingSkeleton />
      ) : (
        <div className="space-y-6">
              {/* Phase 6: citizen heat advisory for the user's city */}
              <AdvisoryBanner />
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
                    heatmap={heatmap}
                    reports={reports}
                    hotspots={hotspots}
                    title="Urban Heat Map — Pakistan (All)"
                    showHeatmap={true}
                    showHotspots={displayPrefs.showHotspots}
                    showMarkers={displayPrefs.showMarkers}
                    disableLegend={true}
                  />
                </div>
                {/* Hotspot breakdown */}
                <div className="lg:col-span-1 h-[60vh] lg:h-[75vh] min-h-125 flex flex-col overflow-hidden">
                  <div className="rounded-2xl transition-shadow bg-white border border-slate-200 shadow-sm p-6 space-y-4 h-full flex flex-col min-h-0">
                    <div eyebrow="Priority Zones" description="Clusters ranked by severity and report density.">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h2 className="font-semibold text-gray-900 text-xl flex items-center gap-2">
                          <Flame className="w-5 h-5 text-orange-500" />
                          Hotspot breakdown
                        </h2>
                        <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
                          Priority Zones
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Clusters ranked by severity and report density.
                      </p>
                    </div>

                    <div className="space-y-3 flex-1 overflow-y-auto pr-1 min-h-0">
                      {((hotspots.length ? hotspots : snapshot?.hotspots) ?? []).map((hotspot, idx) => {
                        const priority =
                          hotspot.priority ||
                          (hotspot.riskTier
                            ? hotspot.riskTier.charAt(0).toUpperCase() + hotspot.riskTier.slice(1)
                            : 'Moderate');
                        const borderStyle =
                          PRIORITY_BORDER[priority] ?? PRIORITY_BORDER.Moderate;
                        const pillStyle =
                          PRIORITY_PILL[priority] ?? PRIORITY_PILL.Moderate;
                        const avgT = hotspot.avgTemperature ?? hotspot.avgTemp ?? hotspot.peakTemp;

                        return (
                          <div
                            key={hotspot.id || hotspot._id || `${hotspot.clusterId || 'hs'}-${idx}`}
                            className={`border-l-4 rounded-r-xl p-3 ${borderStyle}`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <p className="font-semibold text-slate-900 text-sm truncate">
                                {hotspot.area || hotspot.city || `Zone ${idx + 1}`}
                              </p>
                              <span
                                className={`inline-flex items-center font-medium rounded-full px-3 py-1 text-xs shrink-0 ${pillStyle}`}
                              >
                                {priority}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">
                              {hotspot.reportCount ?? 1} reports&nbsp;&bull;&nbsp;
                              {avgT != null
                                ? `${typeof avgT === 'number' ? avgT.toFixed(1) : avgT}°C avg`
                                : 'avg temp N/A'}
                            </p>
                          </div>
                        );
                      })}

                      {!((hotspots.length ? hotspots : snapshot?.hotspots) ?? []).length && (
                        <div className="h-32 flex items-center justify-center text-slate-400 text-xs italic">
                          No active hotspots identified in this window.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
      )}
    </div>
  );
};
export default SaaSDashboard;
