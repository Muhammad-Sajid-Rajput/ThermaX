import { useState, useEffect, useCallback, useMemo } from 'react';
import { AdminPanel } from '../../components/admin';
import { toast } from 'react-hot-toast';
import {
  BarChart3,
  TrendingUp,
  FileText,
  Flame,
  Users,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  PieChart,
  MapPin,
  Clock,
} from 'lucide-react';
import { fetchAdminStats, fetchReports, fetchUsers, fetchHotspots } from '../../services/api';

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalReports: 0,
    pendingReports: 0,
    approvedReports: 0,
    rejectedReports: 0,
    activeHotspots: 0,
    criticalHotspots: 0,
    totalUsers: 0,
    activeUsers: 0,
  });

  const [reports, setReports] = useState([]);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const [adminStats, reportsData, usersData, hotspotsData] = await Promise.all([
        fetchAdminStats().catch(() => null),
        fetchReports().catch(() => ({ data: [] })),
        fetchUsers().catch(() => []),
        fetchHotspots().catch(() => ({ data: [] })),
      ]);

      const rList = reportsData?.data || [];
      const uList = Array.isArray(usersData) ? usersData : [];
      const hList = hotspotsData?.data || [];

      setReports(rList);
      setStats({
        totalReports: adminStats?.totalReports ?? rList.length,
        pendingReports: adminStats?.pendingReports ?? rList.filter((r) => r.status === 'pending').length,
        approvedReports: adminStats?.approvedReports ?? rList.filter((r) => r.status === 'validated' || r.status === 'verified').length,
        rejectedReports: adminStats?.rejectedReports ?? rList.filter((r) => r.status === 'rejected').length,
        activeHotspots: adminStats?.activeHotspots ?? hList.length,
        criticalHotspots: adminStats?.criticalHotspots ?? 0,
        totalUsers: uList.length,
        activeUsers: uList.filter((u) => u.isActive !== false).length,
      });
    } catch (err) {
      console.error('Failed to load analytics:', err);
      toast.error('Failed to load analytics data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Compute Severity Breakdown (Level 1 to 5)
  const severityDistribution = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reports.forEach((r) => {
      const s = r.severityLevel || r.severity || 3;
      if (counts[s] !== undefined) counts[s]++;
      else counts[3]++;
    });

    const total = reports.length || 1;
    return [
      { label: 'Level 5 (Critical)', count: counts[5], pct: Math.round((counts[5] / total) * 100), color: '#dc2626' },
      { label: 'Level 4 (Severe)', count: counts[4], pct: Math.round((counts[4] / total) * 100), color: '#ea580c' },
      { label: 'Level 3 (Moderate)', count: counts[3], pct: Math.round((counts[3] / total) * 100), color: '#eab308' },
      { label: 'Level 2 (Mild)', count: counts[2], pct: Math.round((counts[2] / total) * 100), color: '#84cc16' },
      { label: 'Level 1 (Low)', count: counts[1], pct: Math.round((counts[1] / total) * 100), color: '#10b981' },
    ];
  }, [reports]);

  // Compute Top Reporting Areas
  const topAreas = useMemo(() => {
    const areaMap = {};
    reports.forEach((r) => {
      const area = r.areaName || r.area || r.district || 'Karachi Urban';
      areaMap[area] = (areaMap[area] || 0) + 1;
    });

    return Object.entries(areaMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [reports]);

  // Compute Average Severity
  const avgSeverity = useMemo(() => {
    if (reports.length === 0) return '0.0';
    const sum = reports.reduce((acc, r) => acc + (r.severityLevel || r.severity || 3), 0);
    return (sum / reports.length).toFixed(1);
  }, [reports]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-6 h-6 text-emerald-600" />
            <h1 className="text-xl font-bold text-slate-900">System Analytics & Heat Intelligence</h1>
          </div>
          <p className="text-xs text-slate-500">
            Real data aggregated from the MongoDB database and moderation pipeline
          </p>
        </div>

        <button
          onClick={loadAnalytics}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors text-xs font-semibold shadow-xs disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Submissions
            </span>
            <FileText className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.totalReports}</p>
          <p className="text-[11px] text-slate-400 mt-1">
            {stats.approvedReports} validated in system
          </p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Average Severity
            </span>
            <Flame className="w-4 h-4 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{avgSeverity} / 5</p>
          <p className="text-[11px] text-slate-400 mt-1">Across all verified records</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Hotspots
            </span>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.activeHotspots}</p>
          <p className="text-[11px] text-slate-400 mt-1">
            {stats.criticalHotspots} critical priority
          </p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Registered Citizens
            </span>
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.totalUsers}</p>
          <p className="text-[11px] text-slate-400 mt-1">
            {stats.activeUsers} active accounts
          </p>
        </div>
      </div>

      {/* Analytics Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Severity Distribution */}
        <AdminPanel
          title="Severity Level Distribution"
          subtitle="Proportion of reports by heat intensity"
          icon={Flame}
          iconColor="orange"
        >
          <div className="space-y-3.5 py-1">
            {severityDistribution.map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">{item.label}</span>
                  <span className="font-mono text-slate-500">
                    {item.count} reports ({item.pct}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${item.pct}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </AdminPanel>

        {/* Moderation Status Pipeline */}
        <AdminPanel
          title="Moderation Pipeline Health"
          subtitle="Status breakdown of incoming community reports"
          icon={CheckCircle}
          iconColor="green"
        >
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-100 text-center">
              <p className="text-xl font-bold text-amber-700">{stats.pendingReports}</p>
              <p className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider mt-0.5">
                Pending
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
              <p className="text-xl font-bold text-emerald-700">{stats.approvedReports}</p>
              <p className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider mt-0.5">
                Validated
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-100 text-center">
              <p className="text-xl font-bold text-red-700">{stats.rejectedReports}</p>
              <p className="text-[11px] font-semibold text-red-800 uppercase tracking-wider mt-0.5">
                Rejected
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 space-y-2">
            <div className="flex items-center justify-between">
              <span>Validation Rate:</span>
              <span className="font-bold text-slate-900">
                {stats.totalReports > 0
                  ? Math.round((stats.approvedReports / stats.totalReports) * 100)
                  : 0}
                %
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Rejection Rate:</span>
              <span className="font-bold text-slate-900">
                {stats.totalReports > 0
                  ? Math.round((stats.rejectedReports / stats.totalReports) * 100)
                  : 0}
                %
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Pending Action:</span>
              <span className="font-bold text-amber-700">{stats.pendingReports} reports</span>
            </div>
          </div>
        </AdminPanel>
      </div>

      {/* Top Reported Geographic Areas */}
      <AdminPanel
        title="Top Reported Geographic Areas"
        subtitle="Urban hotspots with the highest concentration of heat reports"
        icon={MapPin}
        iconColor="blue"
      >
        {topAreas.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">
            No geographic data available yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {topAreas.map(([area, count], idx) => (
              <div
                key={area}
                className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-2xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-bold text-slate-800 truncate">{area}</span>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                  {count} reports
                </span>
              </div>
            ))}
          </div>
        )}
      </AdminPanel>
    </div>
  );
}
