import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MapSection from '../../components/dashboard/MapSection';
import { ErrorState, SkeletonBlocks } from '../../components/ui/DataState';
import Panel from '../../components/ui/Panel';
import SectionHeading from '../../components/ui/SectionHeading';
import { fetchReportsCenter, formatTimestamp } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Flame,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  ArrowRight,
  ThermometerSun,
  FileText,
} from 'lucide-react';
// ── Priority helpers ──────────────────────────────────────────────────────────
// Keyed by the backend hotspot DTO's `priority` vocabulary
// (Critical | High | Moderate | Low | Unknown). 'Medium' is kept only as a
// legacy alias — the current API never emits it.
const PRIORITY_BADGE = {
  Critical: 'critical',
  High: 'high',
  Moderate: 'moderate',
  Medium: 'moderate',
  Low: 'warning',
  Unknown: 'gray',
};
const PRIORITY_BORDER = {
  Critical: 'border-l-red-500 bg-red-50',
  High: 'border-l-orange-500 bg-orange-50',
  Moderate: 'border-l-amber-500 bg-amber-50',
  Medium: 'border-l-amber-500 bg-amber-50',
  Low: 'border-l-yellow-500 bg-yellow-50',
  Unknown: 'border-l-slate-400 bg-slate-50',
};
// ── Status helpers (keyed by the Phase 3 lifecycle vocabulary; status is
// stored lowercase on the backend, so normalize + legacy alias here) ─────────
const LEGACY_STATUS_ALIASES = { validated: 'verified', anomaly: 'flagged' };
const canonicalStatus = (s) => {
  const key = String(s || '').toLowerCase();
  return LEGACY_STATUS_ALIASES[key] || key;
};
const STATUS_ICON = { verified: CheckCircle, pending: Clock, flagged: AlertTriangle, rejected: XCircle };
const STATUS_COLOR = {
  verified: 'text-green-600',
  pending: 'text-amber-500',
  flagged: 'text-orange-600',
  rejected: 'text-red-600',
};
// ── Stat bubble ───────────────────────────────────────────────────────────────
const StatBubble = ({ label, value, icon: Icon, color = 'text-slate-700' }) => (
  <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-4 gap-1">
    <Icon className={`w-5 h-5 ${color} mb-0.5`} />
    <p className={`text-lg font-bold ${color}`}>{value}</p>
    <p className="text-xs text-slate-500">{label}</p>
  </div>
);
// ── Main component ────────────────────────────────────────────────────────────
function ReportsPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    fetchReportsCenter()
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch(() => {
        setLoadError(true);
        setLoading(false);
      });
  }, []);
  return (
    <div className="space-y-6">
      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-green-600 mb-1">
            Heat Intelligence
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Active Hotspot Reports
          </h1>
          <p className="text-slate-500 mt-1 max-w-xl leading-snug">
            Real-time heat vulnerability data across Pakistan — sourced from
            citizen reports and satellite correlation.
          </p>
        </div>
        {/* CTA — auth-aware */}
        <button
          onClick={() =>
            isAuthenticated
              ? navigate('/report')
              : navigate('/login', { state: { from: '/report' } })
          }
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm"
        >
          <Flame className="w-4 h-4" />
          {isAuthenticated ? 'Submit a Report' : 'Sign in to Report'}
        </button>
      </div>
      {/* ── Loading / Error ─────────────────────────────────────────────── */}
      {loading && !data ? <SkeletonBlocks count={3} /> : null}
      {loadError ? (
        <ErrorState onRetry={() => window.location.reload()} />
      ) : null}
      {data ? (
        <div className="space-y-8">
          {/* ── Summary Stats ───────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatBubble
              label="Total Reports"
              value={data.reports?.length ?? 0}
              icon={FileText}
              color="text-slate-700"
            />
            <StatBubble
              label="Active Hotspots"
              value={data.hotspots?.length ?? 0}
              icon={Flame}
              color="text-green-600"
            />
            <StatBubble
              label="Critical Zones"
              value={
                data.hotspots?.filter((h) => h.priority === 'Critical')
                  .length ?? 0
              }
              icon={AlertTriangle}
              color="text-red-500"
            />
            <StatBubble
              label="Avg Severity"
              value={
                data.reports?.length
                  ? (
                      data.reports.reduce((s, r) => s + r.severity, 0) /
                      data.reports.length
                    ).toFixed(1)
                  : '—'
              }
              icon={ThermometerSun}
              color="text-amber-500"
            />
          </div>
          {/* ── Map ──────────────────────────────────────────────────────── */}
          <Panel className="space-y-4">
            <SectionHeading
              eyebrow="Live Map"
              title="Hotspot distribution"
              description={`Showing ${data.hotspots?.length ?? 0} identified heat clusters across Pakistan. Updated ${formatTimestamp(data.lastUpdated ?? new Date().toISOString())}.`}
            />
            <div className="h-[60vh] min-h-125 flex flex-col">
              <MapSection
                heatmap={data.heatmap ?? []}
                reports={data.reports ?? []}
                hotspots={data.hotspots ?? []}
                showHeatmap={true}
                showHotspots={true}
                showMarkers={true}
                title="Heat & Hotspots Map"
              />
            </div>
          </Panel>
          {/* ── Recent community reports ─────────────────────────────────── */}
          <Panel className="space-y-4">
            <SectionHeading
              eyebrow="Community Reports"
              title="Recent submissions"
              description="Heat vulnerability reports submitted by citizens and field volunteers."
            />
            <div className="space-y-3">
              {(data.reports ?? []).slice(0, 8).map((rpt, idx) => {
                const statusKey = canonicalStatus(rpt.status);
                const SIcon = STATUS_ICON[statusKey] ?? Clock;
                return (
                  <div
                    key={rpt.id || rpt._id || `rpt-${idx}`}
                    className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50"
                  >
                    {/* Severity dot */}
                    <div className="flex flex-col items-center pt-0.5 shrink-0">
                      <span
                        className={`w-3 h-3 rounded-full shrink-0 ${
                          rpt.severity >= 5
                            ? 'bg-red-500'
                            : rpt.severity >= 4
                              ? 'bg-orange-400'
                              : rpt.severity >= 3
                                ? 'bg-yellow-400'
                                : 'bg-green-400'
                        }`}
                      />
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="font-semibold text-slate-900 text-sm">
                          {rpt.area}
                        </p>
                        <span className="text-xs text-slate-400">{rpt.id}</span>
                      </div>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {rpt.category}
                        &nbsp;·&nbsp;
                        {rpt.source}
                        &nbsp;·&nbsp;
                        {formatTimestamp(rpt.createdAt || rpt.timestamp)}
                      </p>
                    </div>
                    {/* Status + severity badge */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                        S{rpt.severity}
                      </span>
                      <span
                        className={`text-[11px] flex items-center gap-1 ${STATUS_COLOR[statusKey] ?? 'text-slate-500'}`}
                      >
                        <SIcon className="w-3 h-3" />
                        {statusKey}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
          {/* ── User CTA banners ─────────────────────────────────────────── */}
          {!isAuthenticated && (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-6 flex flex-col sm:flex-row items-center gap-4 justify-between">
              <div>
                <p className="font-bold text-slate-900 mb-1">
                  Spotted a heat vulnerability?
                </p>
                <p className="text-sm text-slate-600">
                  Sign in to submit a report and help map urban heat risks in
                  your neighbourhood.
                </p>
              </div>
              <Link
                to="/login"
                className="shrink-0 flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
          {isAuthenticated && (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-6 flex flex-col sm:flex-row items-center gap-4 justify-between">
              <div>
                <p className="font-bold text-slate-900 mb-1">
                  Track your submitted reports
                </p>
                <p className="text-sm text-slate-600">
                  View the moderation status and history of your own heat
                  reports.
                </p>
              </div>
              <Link
                to="/my-reports"
                className="shrink-0 flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              >
                My Reports
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
export default ReportsPage;
