import { startTransition, useDeferredValue, useState } from 'react';
import { Link } from 'react-router-dom';
import MapSection from '../../components/dashboard/MapSection';
import Badge from '../../components/ui/Badge';
import { ErrorState, SkeletonBlocks } from '../../components/ui/DataState';
import Panel from '../../components/ui/Panel';
import SectionHeading from '../../components/ui/SectionHeading';
import useApiResource from '../../hooks/api/useApiResource';
import useHotspots from '../../hooks/data/useHotspots';
import {
  fetchInsightSnapshot,
  formatTimestamp,
  getAvailableAreas,
} from '../../services/api';
import {
  Flame,
  Thermometer,
  Activity,
  Layers,
  Zap,
  AlertTriangle,
  Expand,
  Tag,
  HelpCircle,
} from 'lucide-react';
const PRIORITY_STYLES = {
  Critical: {
    bg: 'bg-red-50 border-red-200 text-red-700',
    badge: 'bg-red-100 text-red-700',
    dot: 'bg-red-500',
  },
  High: {
    bg: 'bg-orange-50 border-orange-200 text-orange-700',
    badge: 'bg-orange-100 text-orange-700',
    dot: 'bg-orange-500',
  },
  Medium: {
    bg: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    badge: 'bg-yellow-100 text-yellow-700',
    dot: 'bg-yellow-500',
  },
  Low: {
    bg: 'bg-green-50 border-green-200 text-green-700',
    badge: 'bg-green-100 text-green-700',
    dot: 'bg-green-500',
  },
};
function Insight() {
  const [filters, setFilters] = useState({
    range: '7d',
    severity: 'all',
    area: 'all',
  });
  const deferredFilters = useDeferredValue(filters);
  const insightState = useApiResource(fetchInsightSnapshot, deferredFilters);
  const hotspotState = useHotspots(deferredFilters);
  const hotspots = hotspotState.data?.data ?? [];
  const insight = insightState.data;
  const setArea = (area) => {
    startTransition(() => {
      setFilters((current) => ({ ...current, area }));
    });
  };
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            DBSCAN Hotspot Intelligence
          </h1>
          <p className="text-slate-600 mt-1">
            Expose the clustering logic behind hotspot detection so operators
            can trust why a location is being prioritized.
          </p>
        </div>
        <Link
          to="/dashboard"
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
      <Panel className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Cluster Filters
            </p>
            <p className="text-sm text-slate-600">
              Narrow the cluster board by monitored area.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {['all', ...getAvailableAreas()].map((area) => (
              <button
                key={area}
                onClick={() => setArea(area)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  filters.area === area
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {area}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>
            Showing {hotspots.length} hotspot{hotspots.length !== 1 ? 's' : ''}
          </span>
          <span>&bull;</span>
          <span>
            Last updated{' '}
            {formatTimestamp(insight?.lastUpdated ?? new Date().toISOString())}
          </span>
        </div>
      </Panel>
      {insightState.loading && !insight ? <SkeletonBlocks count={4} /> : null}
      {insightState.error ? <ErrorState onRetry={insightState.reload} /> : null}
      {insight && (
        <div className="space-y-6">
          {/* ── Cluster Cards + Stats ──────────────────────────────── */}
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Panel className="space-y-4">
              <SectionHeading
                eyebrow="Cluster Cards"
                title="Priority-ranked hotspot clusters"
                description="Each card reflects DBSCAN output and satellite fusion signals for a hotspot polygon."
              />
              <div className="grid gap-4 md:grid-cols-2">
                {insight.hotspots.map((cluster) => {
                  const style =
                    PRIORITY_STYLES[cluster.priority] ?? PRIORITY_STYLES.Low;
                  const avgTemp =
                    cluster.avgTemperature ?? cluster.ndvi * 40 ?? 0;
                  const avgSev = cluster.avgSeverity ?? cluster.severity ?? 3;
                  const confidence = (cluster.confidence ?? 0.8) * 100;
                  return (
                    <div
                      key={cluster.clusterId ?? cluster.id}
                      className={`rounded-xl border p-4 ${style.bg}`}
                    >
                      {/* Header row */}
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                              {cluster.clusterId ?? cluster.id}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${style.badge}`}
                            >
                              {cluster.priority}
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-slate-900">
                            {cluster.area ?? cluster.name}
                          </h3>
                        </div>
                        {/* Confidence radial indicator (simplified) */}
                        <div className="relative w-10 h-10 flex items-center justify-center">
                          <svg
                            viewBox="0 0 36 36"
                            className="w-10 h-10 transform -rotate-90"
                          >
                            <circle
                              cx="18"
                              cy="18"
                              r="14"
                              fill="none"
                              stroke="#e2e8f0"
                              strokeWidth="3"
                            />
                            <circle
                              cx="18"
                              cy="18"
                              r="14"
                              fill="none"
                              stroke={style.dot.replace('bg-', '#')}
                              strokeWidth="3"
                              strokeDasharray={`${confidence} ${100 - confidence}`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <span className="absolute text-[8px] font-bold text-slate-700">
                            {Math.round(confidence)}%
                          </span>
                        </div>
                      </div>
                      {/* Metrics grid */}
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {[
                          [
                            <Thermometer className="w-3 h-3" />,
                            'Avg Temp',
                            `${avgTemp.toFixed(1)}°C`,
                          ],
                          [
                            <Activity className="w-3 h-3" />,
                            'Avg Severity',
                            `${avgSev.toFixed(1)}`,
                          ],
                          [
                            <Layers className="w-3 h-3" />,
                            'Reports',
                            cluster.reportCount ?? cluster.reports?.length ?? 0,
                          ],
                        ].map(([icon, label, val], i) => (
                          <div
                            key={i}
                            className="bg-white/70 rounded-lg p-2 text-center"
                          >
                            <div className="flex items-center justify-center gap-1 text-slate-400 mb-0.5">
                              {icon}
                            </div>
                            <p className="text-[10px] text-slate-500 uppercase">
                              {label}
                            </p>
                            <p className="text-sm font-bold text-slate-900">
                              {val}
                            </p>
                          </div>
                        ))}
                      </div>
                      {/* NDVI bar */}
                      <div className="mb-2">
                        <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                          <span>NDVI (Vegetation)</span>
                          <span className="font-medium">
                            {((cluster.ndvi ?? 0.5) * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${(cluster.ndvi ?? 0.5) * 100}%` }}
                          />
                        </div>
                      </div>
                      {/* Aggregation score progress bar */}
                      <div>
                        <div className="flex justify-between text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 mb-1">
                          <span>Aggregation Score</span>
                          <span>{Math.round(confidence)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-linear-to-r from-green-600 to-orange-500"
                            style={{ width: `${confidence}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>
            {/* Stats + Distribution */}
            <div className="space-y-4">
              <Panel className="space-y-4">
                <SectionHeading
                  eyebrow="Cluster Statistics"
                  title="Aggregated metrics"
                  description="Overview of all detected clusters across the monitored area."
                />
                <div className="grid gap-3">
                  {insight.stats &&
                    Object.entries(insight.stats).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50"
                      >
                        <span className="text-sm font-medium text-slate-600 capitalize">
                          {key.replace(/_/g, '')}
                        </span>
                        <span className="text-sm font-bold text-slate-900">
                          {typeof value === 'number'
                            ? value.toLocaleString()
                            : value}
                        </span>
                      </div>
                    ))}
                </div>
              </Panel>
              <Panel className="space-y-4">
                <SectionHeading
                  eyebrow="Cluster Distribution"
                  title="Severity breakdown"
                  description="Distribution of clusters by severity level across all areas."
                />
                <div className="space-y-3">
                  {insight.distribution &&
                    Object.entries(insight.distribution).map(
                      ([severity, count]) => (
                        <div
                          key={severity}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm font-medium text-slate-600 capitalize">
                            {severity}
                          </span>
                          <span className="text-sm font-bold text-slate-900">
                            {count}
                          </span>
                        </div>
                      )
                    )}
                </div>
              </Panel>
            </div>
          </div>
          {/* ── Mini-map ────────────────────────────────────────────── */}
          <Panel className="space-y-4">
            <SectionHeading
              eyebrow="Mini-map"
              title="Cluster polygons"
              description="A simplified map showing the same DBSCAN polygons used on the dashboard."
            />
            <div className="h-[60vh] min-h-125 flex flex-col">
              <MapSection
                hotspots={hotspots}
                heatmap={insight.heatmap ?? []}
                reports={insight.reports ?? []}
              />
            </div>
          </Panel>
          {/* ── DBSCAN Explanation ─────────────────────────────────── */}
          <Panel className="space-y-6">
            <SectionHeading
              eyebrow="How Hotspots Are Detected"
              title="Explainable DBSCAN"
              description="The system keeps the model visible for non-technical stakeholders."
            />
            {/* 3-step visual flow */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  icon: Zap,
                  title: 'Identify Dense Regions',
                  desc: 'DBSCAN scans all user reports and finds areas where points are packed within eps distance (e.g., 500m). Each dense core becomes a cluster seed.',
                  color: 'bg-green-50 border-green-200 text-green-700',
                },
                {
                  icon: Expand,
                  title: 'Expand Clusters',
                  desc: 'From each seed, DBSCAN recursively adds neighboring points within eps. This grows the cluster to include all reachable dense areas.',
                  color: 'bg-green-50 border-green-200 text-green-700',
                },
                {
                  icon: Tag,
                  title: 'Label Noise',
                  desc: "Points that fall outside all cluster eps-neighborhoods are labeled as noise (cluster -1). These are isolated reports that don't form a pattern.",
                  color: 'bg-orange-50 border-orange-200 text-orange-700',
                },
              ].map(({ icon: Icon, title, desc, color }, i) => (
                <div key={i} className={`rounded-xl border p-4 ${color}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-white/70 flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Step {i + 1}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm mb-2">{title}</h4>
                  <p className="text-xs leading-relaxed opacity-80">{desc}</p>
                </div>
              ))}
            </div>
            {/* Noise explanation */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <HelpCircle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-1">
                  Noise Points (Label -1)
                </p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  DBSCAN assigns cluster ID{' '}
                  <code className="text-xs bg-slate-200 px-1 py-0.5 rounded">
                    -1
                  </code>{' '}
                  to noise points. These are individual heat reports that don't
                  belong to any dense region. Noise points are still displayed
                  on the map but are excluded from hotspot aggregation and
                  priority scoring. This helps distinguish true hotspots from
                  isolated incidents.
                </p>
              </div>
            </div>
            {/* Original explanation text from API */}
            {insight.explanation && (
              <div className="space-y-3 text-sm leading-6 text-slate-600">
                <p>{insight.explanation.clustering}</p>
                <p>{insight.explanation.noise}</p>
              </div>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
export default Insight;
