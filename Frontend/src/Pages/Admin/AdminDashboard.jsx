import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  KPICard,
  AdminPanel,
  StatusBadge,
} from '../../components/admin';
import MapSection from '../../components/dashboard/MapSection';
import { toast } from 'react-hot-toast';
import {
  FileText,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Shield,
  Activity,
  Flame,
  UserCheck,
  RefreshCw,
} from 'lucide-react';
import {
  fetchReports,
  updateModerationStatus,
  fetchUsers,
  fetchAdminStats,
  fetchHeatmap,
  fetchHotspots,
  fetchEnrichmentFailures,
  retryEnrichmentFailure,
  dismissEnrichmentFailure,
  formatTimestamp,
} from '../../services/api';

// Sparkline chart component
const Sparkline = ({ data = [10, 15, 12, 18, 20, 25], color = '#10B981' }) => {
  const safeData = data.length > 1 ? data : [data[0] || 0, data[0] || 1];
  const max = Math.max(...safeData);
  const min = Math.min(...safeData);
  const range = max - min || 1;
  const points = safeData
    .map((value, index) => {
      const x = (index / (safeData.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-12">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        points={points}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

function AdminDashboard() {
  const navigate = useNavigate();

  // Real Stats from Database
  const [stats, setStats] = useState({
    pendingReports: 0,
    criticalHotspots: 0,
    criticalRiskTierHotspots: 0,
    activeHotspots: 0,
    totalReports: 0,
    approvedReports: 0,
    rejectedReports: 0,
    totalUsers: 0,
    activeUsers: 0,
    suspendedUsers: 0,
    adminUsers: 0,
  });

  // Data states
  const [pendingReports, setPendingReports] = useState([]);
  const [mapHotspots, setMapHotspots] = useState([]);
  const [mapReports, setMapReports] = useState([]);
  const [unlocatableReports, setUnlocatableReports] = useState(0);
  const [mapHeatmap, setMapHeatmap] = useState([]);
  const [enrichmentFailures, setEnrichmentFailures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, reportsData, usersData, hotspotsData, heatmapData, failuresData] = await Promise.all([
        fetchAdminStats().catch(() => null),
        fetchReports({ status: 'pending', limit: 6 }).catch(() => ({ data: [] })),
        fetchUsers().catch(() => []),
        fetchHotspots().catch(() => ({ data: [] })),
        fetchHeatmap().catch(() => ({ data: [] })),
        fetchEnrichmentFailures().catch(() => []),
      ]);
      setEnrichmentFailures(Array.isArray(failuresData) ? failuresData : []);

      const usersList = Array.isArray(usersData) ? usersData : [];
      const totalUsers = usersList.length;
      const activeUsers = usersList.filter((u) => u.isActive !== false).length;
      const suspendedUsers = usersList.filter((u) => u.isActive === false).length;
      const adminUsers = usersList.filter(
        (u) => (u.role || '').toUpperCase() === 'ADMIN'
      ).length;

      const rawReports = reportsData?.data || [];
      const pReports = rawReports.filter(
        (r) => (r.status || 'pending').toLowerCase() === 'pending'
      );
      const hSpots = hotspotsData?.data || [];
      const hPoints = heatmapData?.data || [];

      const formattedReports = rawReports.map((r) => ({
        ...r,
        id: r._id || r.id,
        area: r.areaName || r.area || 'Unknown area',
        severity: r.severityLevel || r.severity || 3,
        coordinates: [
          r.latitude ?? r.location?.lat ?? null,
          r.longitude ?? r.location?.lng ?? null,
        ],
      }));
      // Never pin reports without coordinates at a fabricated city center:
      // only reports with real coordinates are plotted on the map.
      const locatableReports = formattedReports.filter(
        (r) =>
          Number.isFinite(r.coordinates[0]) && Number.isFinite(r.coordinates[1])
      );
      const unlocatableCount = formattedReports.length - locatableReports.length;

      setPendingReports(pReports.slice(0, 5));
      setMapHotspots(hSpots);
      setMapHeatmap(hPoints);
      setMapReports(locatableReports);
      setUnlocatableReports(unlocatableCount);

      setStats({
        pendingReports: statsData?.pendingReports ?? pReports.length,
        criticalHotspots: statsData?.criticalHotspots ?? hSpots.filter((h) => (h.priority || '').toLowerCase() === 'critical' || (h.severity && h.severity >= 4)).length,
        criticalRiskTierHotspots: statsData?.criticalRiskTierHotspots ?? hSpots.filter((h) => (h.riskTier || '').toLowerCase() === 'critical').length,
        activeHotspots: statsData?.activeHotspots ?? hSpots.length,
        totalReports: statsData?.totalReports ?? 0,
        approvedReports: statsData?.approvedReports ?? 0,
        rejectedReports: statsData?.rejectedReports ?? 0,
        totalUsers,
        activeUsers,
        suspendedUsers,
        adminUsers,
      });
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      toast.error('Failed to synchronize with server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Handle Moderation
  const handleReportAction = async (reportId, action) => {
    try {
      setActionLoadingId(reportId);
      const newStatus = action === 'approve' ? 'verified' : 'rejected';

      // Optimistic update: immediately remove from pending queue in UI
      setPendingReports((prev) =>
        prev.filter((r) => (r._id || r.id) !== reportId)
      );
      setStats((prev) => ({
        ...prev,
        pendingReports: Math.max(0, prev.pendingReports - 1),
        approvedReports:
          action === 'approve' ? prev.approvedReports + 1 : prev.approvedReports,
        rejectedReports:
          action === 'reject' ? prev.rejectedReports + 1 : prev.rejectedReports,
      }));

      await updateModerationStatus(reportId, newStatus);
      toast.success(
        action === 'approve'
          ? 'Report approved & verified'
          : 'Report rejected'
      );
      await loadDashboardData();
    } catch {
      toast.error('Action failed. Please try again.');
      await loadDashboardData();
    } finally {
      setActionLoadingId(null);
    }
  };

  // Phase 4: enrichment dead letters — retry or dismiss, then refresh.
  const handleFailureRetry = async (failureId) => {
    try {
      setActionLoadingId(failureId);
      await retryEnrichmentFailure(failureId);
      toast.success('Enrichment re-queued');
      await loadDashboardData();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Retry failed. Please try again.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleFailureDismiss = async (failureId) => {
    try {
      setActionLoadingId(failureId);
      await dismissEnrichmentFailure(failureId);
      toast.success('Failure dismissed');
      await loadDashboardData();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Dismiss failed. Please try again.');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <Shield className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Admin Command Center</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Monitoring
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Real-time heat risk oversight, incident moderation dispatch, and national system governance
          </p>
        </div>

        <button
          onClick={loadDashboardData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors text-xs font-semibold shadow-2xs disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Real KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="PENDING MODERATION"
          value={stats.pendingReports}
          change={stats.pendingReports > 0 ? 'Requires action' : 'Queue clear'}
          changeType={stats.pendingReports > 0 ? 'up' : 'down'}
          trend="pending verification"
          icon={FileText}
          color="orange"
          glow={stats.pendingReports > 0}
        >
          <Sparkline data={[5, 8, 4, 10, stats.pendingReports]} color="#f97316" />
        </KPICard>

        <KPICard
          title="CRITICAL HOTSPOTS (TEMP-SEVERITY)"
          value={stats.criticalHotspots}
          change={`${stats.activeHotspots} total active · ${stats.criticalRiskTierHotspots ?? 0} TVI-critical`}
          changeType="neutral"
          trend="spatial clusters"
          icon={Flame}
          color="red"
          glow={stats.criticalHotspots > 0}
        >
          <Sparkline data={[2, 4, 3, stats.criticalHotspots]} color="#ef4444" />
        </KPICard>

        <KPICard
          title="REGISTERED CITIZENS"
          value={stats.totalUsers}
          change={`${stats.activeUsers} active accounts`}
          changeType="up"
          trend="verified users"
          icon={Users}
          color="green"
        >
          <Sparkline data={[stats.activeUsers, stats.totalUsers]} color="#10B981" />
        </KPICard>

        <KPICard
          title="TOTAL CITIZEN REPORTS"
          value={stats.totalReports}
          change={`${stats.approvedReports} verified`}
          changeType="up"
          trend="all time"
          icon={Activity}
          color="blue"
        >
          <Sparkline data={[stats.rejectedReports, stats.approvedReports, stats.totalReports]} color="#3b82f6" />
        </KPICard>
      </div>

      {/* Row 2: Visual Command Center (Interactive Map + Hotspots Feed) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Map (2 Cols) */}
        <div className="lg:col-span-2 h-135 flex flex-col overflow-hidden rounded-2xl border border-slate-200 shadow-sm bg-white">
          <MapSection
            heatmap={mapHeatmap}
            hotspots={mapHotspots}
            reports={mapReports}
            title="Urban Heat Map — Pakistan (All)"
            initialCenter={[30.3753, 69.3451]}
            initialZoom={5.5}
            showHeatmap={true}
            showHotspots={true}
            showMarkers={true}
            disableLegend={true}
          />
          {unlocatableReports > 0 && (
            <p className="px-4 py-2 text-[11px] text-slate-400 bg-white border-t border-slate-100">
              {unlocatableReports} report{unlocatableReports === 1 ? '' : 's'} without
              location data {unlocatableReports === 1 ? 'is' : 'are'} not shown on the map.
            </p>
          )}
        </div>

        {/* Hotspots Feed Panel (1 Col) - Perfectly Aligned Height */}
        <div className="lg:col-span-1">
          <AdminPanel
            title="Critical Hotspots"
            subtitle={`${mapHotspots.length} active spatial clusters`}
            icon={Flame}
            iconColor="orange"
            className="h-135 flex flex-col"
          >
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {mapHotspots.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <Flame className="w-10 h-10 stroke-1 text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-600">No Active Hotspots</p>
                  <p className="text-xs text-slate-400 mt-1">
                    No critical heat clusters detected in current spatial monitoring.
                  </p>
                </div>
              ) : (
                mapHotspots.map((hs, index) => {
                  const priority = hs.priority || (hs.avgSeverity >= 4 ? 'Critical' : 'High');
                  const isCritical = priority.toLowerCase() === 'critical';
                  const isHigh = priority.toLowerCase() === 'high';

                  const badgeClasses = isCritical
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : isHigh
                    ? 'bg-orange-50 text-orange-700 border-orange-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200';

                  const borderClasses = isCritical
                    ? 'border-l-red-500 hover:border-red-300'
                    : isHigh
                    ? 'border-l-orange-500 hover:border-orange-300'
                    : 'border-l-amber-500 hover:border-amber-300';

                  return (
                    <div
                      key={hs.id || hs.clusterId || index}
                      onClick={() => navigate('/admin/heatmap')}
                      className={`p-3 rounded-xl border border-slate-200 ${borderClasses} border-l-4 bg-white hover:bg-slate-50/60 transition-all duration-200 cursor-pointer shadow-2xs group`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                            {hs.area || hs.district || hs.name || 'Hotspot Zone'}
                          </p>
                          <p className="text-[11px] text-slate-500 font-medium">
                            Cluster #{hs.clusterId || index + 1} &bull; {hs.city || 'Pakistan'}
                          </p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${badgeClasses}`}>
                          {priority}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100 text-center">
                        <div className="bg-slate-50 rounded-lg py-1 px-1">
                          <span className="text-[10px] text-slate-400 font-medium block">Avg Temp</span>
                          <span className="text-xs font-bold font-mono text-slate-800">
                            {(hs.avgTemperature ?? hs.avgTemp) != null ? `${hs.avgTemperature ?? hs.avgTemp}°C` : 'N/A'}
                          </span>
                        </div>
                        <div className="bg-slate-50 rounded-lg py-1 px-1">
                          <span className="text-[10px] text-slate-400 font-medium block">Reports</span>
                          <span className="text-xs font-bold font-mono text-slate-800">
                            {hs.reportCount ?? 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick summary footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium">
                {mapHotspots.filter((h) => (h.priority || '').toLowerCase() === 'critical').length} Critical Risk Zones
              </span>
              <button
                onClick={() => navigate('/admin/heatmap')}
                className="text-emerald-600 hover:text-emerald-700 font-semibold inline-flex items-center gap-1 transition-colors"
              >
                View on Map &rarr;
              </button>
            </div>
          </AdminPanel>
        </div>
      </div>

      {/* Row 3: Operational Governance (Moderation Queue + User Governance & Diagnostics) */}
      {/* Phase 4: enrichment dead letters — only rendered when failures exist. */}
      {enrichmentFailures.length > 0 && (
        <AdminPanel
          title={`ML Enrichment Failures (${enrichmentFailures.length})`}
          subtitle="Reports whose enrichment trigger failed after 3 retries. The ML scheduler will pick up pending reports on its next tick; retry now or dismiss."
          icon={AlertTriangle}
          iconColor="yellow"
        >
          <div className="space-y-3">
            {enrichmentFailures.map((f) => (
              <div
                key={f._id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-amber-200 bg-amber-50"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {f.report?.reportRef || 'Report'} · {f.report?.city || 'Unknown city'}
                  </p>
                  <p className="text-xs text-slate-600 truncate">
                    {f.attempts} attempts · {f.lastError} · {formatTimestamp(f.lastAttemptAt)}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleFailureRetry(f._id)}
                    disabled={actionLoadingId === f._id}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
                  >
                    Retry
                  </button>
                  <button
                    onClick={() => handleFailureDismiss(f._id)}
                    disabled={actionLoadingId === f._id}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </AdminPanel>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Moderation Queue Panel */}
        <AdminPanel
          title="Moderation Queue"
          subtitle={`${stats.pendingReports} submissions awaiting validation`}
          icon={AlertTriangle}
          iconColor="orange"
          action
          actionLabel="View All Reports"
          onAction={() => navigate('/admin/reports')}
        >
          {loading && pendingReports.length === 0 ? (
            <div className="space-y-3 py-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-slate-100/80 rounded-xl animate-pulse"></div>
              ))}
            </div>
          ) : pendingReports.length === 0 ? (
            <div className="text-center py-10 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
              <p className="text-sm text-slate-800 font-bold">Queue is Clean!</p>
              <p className="text-xs text-slate-500 mt-0.5">
                All community heat reports have been processed.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {pendingReports.map((report) => {
                const rId = report._id || report.id;
                const severity = report.severityLevel || report.severity || 3;
                const area = report.areaName || report.area || 'Unknown area';
                const userName = report.user?.fullName || report.userName || 'Citizen';

                return (
                  <div
                    key={rId}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 transition-all duration-150 shadow-2xs group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-lg shrink-0 flex items-center justify-center font-bold text-xs ${
                          severity >= 5
                            ? 'bg-red-100 text-red-700'
                            : severity >= 4
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        L{severity}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {area}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          Reported by <span className="font-medium text-slate-700">{userName}</span> • {formatTimestamp(report.createdAt || report.timestamp)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <button
                        onClick={() => handleReportAction(rId, 'approve')}
                        disabled={actionLoadingId === rId}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold transition-colors flex items-center gap-1 disabled:opacity-50"
                        title="Validate Report"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Approve</span>
                      </button>
                      <button
                        onClick={() => handleReportAction(rId, 'reject')}
                        disabled={actionLoadingId === rId}
                        className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 text-xs font-semibold transition-colors flex items-center gap-1 disabled:opacity-50"
                        title="Reject Report"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Reject</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </AdminPanel>

        {/* User Governance */}
        <AdminPanel
          title="User Governance"
          subtitle="Citizen account statistics and directory controls"
          icon={Users}
          iconColor="green"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <p className="text-xl font-bold text-slate-900">{stats.totalUsers}</p>
              <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                Total Users
              </p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
              <p className="text-xl font-bold text-emerald-700">{stats.activeUsers}</p>
              <p className="text-[11px] text-emerald-700 font-semibold uppercase tracking-wider">
                Active
              </p>
            </div>
            <div className="bg-purple-50 rounded-xl p-3 border border-purple-100">
              <p className="text-xl font-bold text-purple-700">{stats.adminUsers}</p>
              <p className="text-[11px] text-purple-700 font-semibold uppercase tracking-wider">
                Admins
              </p>
            </div>
            <div className="bg-red-50 rounded-xl p-3 border border-red-100">
              <p className="text-xl font-bold text-red-700">{stats.suspendedUsers}</p>
              <p className="text-[11px] text-red-700 font-semibold uppercase tracking-wider">
                Suspended
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/admin/users')}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors shadow-2xs mt-auto"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Open User Directory</span>
          </button>
        </AdminPanel>
      </div>
    </div>
  );
}

export default AdminDashboard;
