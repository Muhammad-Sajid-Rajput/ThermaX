import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  KPICard,
  AdminPanel,
  StatusBadge,
  ActivityFeed,
} from '../../components/admin';
import { toast } from 'react-hot-toast';
import {
  FileText,
  Users,
  AlertTriangle,
  Map,
  Flame,
  CheckCircle,
  XCircle,
  Shield,
  Activity,
  Bell,
  TrendingUp,
  TrendingDown,
  UserCheck,
  Lock,
  AlertCircle,
  MapPin,
  Zap,
  Thermometer,
  Wind,
  Droplets,
  Eye,
} from 'lucide-react';
import {
  fetchReports,
  updateModerationStatus,
  fetchUsers,
  updateUserStatus,
  fetchAdminStats,
} from '../../services/api';
// Sparkline chart component
const Sparkline = ({ data, color = '#FF6B35', positive = true }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join('');
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="w-full h-12"
    >
      <defs>
        <linearGradient
          id={`gradient-${color.replace('#', '')}`}
          x1="0%"
          y1="0%"
          x2="0%"
          y2="100%"
        >
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        points={points}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polygon
        fill={`url(#gradient-${color.replace('#', '')})`}
        points={`0,100 ${points} 100,100`}
      />
    </svg>
  );
};
function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  // Stats
  const [stats, setStats] = useState({
    pendingReports: 24,
    criticalHotspots: 7,
    activeUsers: 128,
    alertsTriggered: 5,
  });
  // Data states
  const [pendingReports, setPendingReports] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReports, setSelectedReports] = useState([]);
  // Load data
  useEffect(() => {
    loadDashboardData();
  }, []);
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load stats
      const statsData = await fetchAdminStats();
      if (statsData) {
        setStats({
          pendingReports: statsData.pendingReports || 24,
          criticalHotspots: statsData.criticalHotspots || 7,
          activeUsers: statsData.activeUsers || 128,
          alertsTriggered: statsData.alertsTriggered || 5,
        });
      }
      // Load pending reports
      const reportsData = await fetchReports({ status: 'pending', limit: 5 });
      setPendingReports(reportsData?.data?.slice(0, 5) || mockPendingReports);
      // Load recent users
      const usersData = await fetchUsers({ limit: 5 });
      setRecentUsers(usersData?.slice(0, 5) || mockRecentUsers);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      // Use mock data as fallback
      setPendingReports(mockPendingReports);
      setRecentUsers(mockRecentUsers);
    } finally {
      setLoading(false);
    }
  };
  // Mock data for initial render
  const mockPendingReports = [
    {
      id: 'RPT-2026-1552',
      area: 'Korangi',
      severity: 5,
      user: { name: 'Ahmed Khan' },
      timestamp: new Date().toISOString(),
    },
    {
      id: 'RPT-2026-1551',
      area: 'Saddar',
      severity: 4,
      user: { name: 'Fatima Ali' },
      timestamp: new Date().toISOString(),
    },
    {
      id: 'RPT-2026-1550',
      area: 'Gulshan',
      severity: 3,
      user: { name: 'Omar Hassan' },
      timestamp: new Date().toISOString(),
    },
    {
      id: 'RPT-2026-1549',
      area: 'DHA',
      severity: 4,
      user: { name: 'Zara Ahmed' },
      timestamp: new Date().toISOString(),
    },
    {
      id: 'RPT-2026-1548',
      area: 'Landhi',
      severity: 5,
      user: { name: 'Bilal Raza' },
      timestamp: new Date().toISOString(),
    },
  ];
  const mockRecentUsers = [
    {
      id: 1,
      name: 'Ahmed Khan',
      email: 'ahmed@email.com',
      role: 'USER',
      status: 'active',
      reportsSubmitted: 12,
    },
    {
      id: 2,
      name: 'Fatima Ali',
      email: 'fatima@email.com',
      role: 'USER',
      status: 'active',
      reportsSubmitted: 8,
    },
    {
      id: 3,
      name: 'Omar Hassan',
      email: 'omar@email.com',
      role: 'USER',
      status: 'suspended',
      reportsSubmitted: 3,
    },
    {
      id: 4,
      name: 'Zara Ahmed',
      email: 'zara@email.com',
      role: 'ADMIN',
      status: 'active',
      reportsSubmitted: 25,
    },
    {
      id: 5,
      name: 'Bilal Raza',
      email: 'bilal@email.com',
      role: 'USER',
      status: 'active',
      reportsSubmitted: 6,
    },
  ];
  // Actions
  const handleReportAction = async (reportId, action) => {
    try {
      if (action === 'approve') {
        await updateModerationStatus(reportId, 'validated');
        toast.success('Report approved');
      } else if (action === 'reject') {
        await updateModerationStatus(reportId, 'rejected');
        toast.success('Report rejected');
      }
      loadDashboardData();
    } catch (err) {
      toast.error('Action failed');
    }
  };
  const handleUserAction = async (userId, action) => {
    try {
      if (action === 'suspend') {
        await updateUserStatus(userId, false);
        toast.success('User suspended');
      } else if (action === 'activate') {
        await updateUserStatus(userId, true);
        toast.success('User activated');
      }
      loadDashboardData();
    } catch (err) {
      toast.error('Action failed');
    }
  };
  const handleBroadcastAlert = () => {
    navigate('/admin/alerts');
  };
  // Sparkline data
  const trendData = [35, 42, 38, 45, 52, 48, 55, 62, 58, 65, 72, 68];
  const alertData = [5, 8, 6, 12, 9, 15, 11, 18, 14, 20, 16, 22];
  const userData = [120, 125, 118, 130, 128, 135, 142, 138, 145, 140, 148, 152];
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Shield className="w-6 h-6 text-green-600" />
            <h1 className="text-2xl font-bold text-slate-900">
              Admin Command Center
            </h1>
          </div>
          <p className="text-slate-500 font-medium">
            ThermaX System Control Panel
          </p>
        </div>
      </div>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="PENDING REPORTS"
          value={stats.pendingReports}
          change="16%"
          changeType="up"
          trend="from yesterday"
          icon={FileText}
          color="red"
          glow={stats.pendingReports > 20}
        >
          <Sparkline data={alertData} color="#EF4444" />
        </KPICard>
        <KPICard
          title="CRITICAL HOTSPOTS"
          value={stats.criticalHotspots}
          change="40%"
          changeType="up"
          trend="from yesterday"
          icon={Flame}
          color="orange"
          glow={stats.criticalHotspots > 5}
        >
          <Sparkline data={alertData} color="#FF6B35" />
        </KPICard>
        <KPICard
          title="ACTIVE USERS"
          value={stats.activeUsers}
          change="12%"
          changeType="up"
          trend="from yesterday"
          icon={Users}
          color="green"
        >
          <Sparkline data={userData} color="#10B981" />
        </KPICard>
        <KPICard
          title="ALERTS TRIGGERED"
          value={stats.alertsTriggered}
          change="20%"
          changeType="down"
          trend="from yesterday"
          icon={Bell}
          color="blue"
        >
          <Sparkline data={trendData} color="#3B82F6" />
        </KPICard>
      </div>
      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Moderation Queue - Takes 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Moderation Queue Panel */}
          <AdminPanel
            title="Moderation Queue"
            subtitle="Pending report approvals"
            icon={AlertTriangle}
            iconColor="red"
            action
            actionLabel="View All"
            onAction={() => navigate('/admin/reports')}
          >
            {loading ? (
              <div className="animate-pulse space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-14 bg-slate-100 rounded-lg"></div>
                ))}
              </div>
            ) : pendingReports.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
                <p className="text-slate-700 font-medium">All caught up!</p>
                <p className="text-slate-500 text-sm">
                  No pending reports to moderate
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingReports.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          report.severity >= 5
                            ? 'bg-red-100 text-red-600'
                            : report.severity >= 4
                              ? 'bg-orange-100 text-orange-600'
                              : report.severity >= 3
                                ? 'bg-amber-100 text-amber-600'
                                : 'bg-green-100 text-green-600'
                        }`}
                      >
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          {report.id}
                        </p>
                        <p className="text-sm text-slate-500">
                          {report.area} • {report.user?.name || 'Unknown'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge
                        status={
                          report.severity >= 5
                            ? 'critical_severity'
                            : report.severity >= 4
                              ? 'high'
                              : 'moderate'
                        }
                        size="sm"
                      />
                      <span className="text-xs text-slate-500">
                        {report.timestamp
                          ? new Date(report.timestamp).toRelativeTime?.() ||
                            'Recently'
                          : 'Recently'}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            handleReportAction(
                              report.id || report._id,
                              'approve'
                            )
                          }
                          className="p-2 rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-colors"
                          title="Approve"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            handleReportAction(
                              report.id || report._id,
                              'reject'
                            )
                          }
                          className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                          title="Reject"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {pendingReports.length === 5 && (
                  <p className="text-center text-sm text-slate-500 pt-2">
                    Showing 5 of {stats.pendingReports} pending reports
                  </p>
                )}
              </div>
            )}
          </AdminPanel>
          {/* User Control Panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* User Stats */}
            <AdminPanel
              title="User Control Panel"
              subtitle="Account management overview"
              icon={Users}
              iconColor="green"
              action
              actionLabel="Manage"
              onAction={() => navigate('/admin/users')}
            >
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-slate-100 rounded-xl p-4 border border-slate-200">
                  <p className="text-2xl font-bold text-slate-900">532</p>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">
                    Total Users
                  </p>
                </div>
                <div className="bg-emerald-100 rounded-xl p-4 border border-emerald-200">
                  <p className="text-2xl font-bold text-emerald-600">451</p>
                  <p className="text-xs text-emerald-600 uppercase tracking-wider">
                    Active
                  </p>
                  <p className="text-xs text-slate-500">84.8% of total</p>
                </div>
                <div className="bg-red-100 rounded-xl p-4 border border-red-200">
                  <p className="text-2xl font-bold text-red-600">38</p>
                  <p className="text-xs text-red-600 uppercase tracking-wider">
                    Suspended
                  </p>
                  <p className="text-xs text-slate-500">7.1% of total</p>
                </div>
                <div className="bg-orange-100 rounded-xl p-4 border border-orange-200">
                  <p className="text-2xl font-bold text-orange-600">15</p>
                  <p className="text-xs text-orange-600 uppercase tracking-wider">
                    Flagged Users
                  </p>
                  <p className="text-xs text-slate-500">2.8% of total</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate('/admin/users')}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-100 text-green-700 hover:bg-green-200 transition-colors text-sm font-medium border border-green-200"
                >
                  <UserCheck className="w-4 h-4" />
                  Add Admin
                </button>
                <button
                  onClick={() => navigate('/admin/users')}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors text-sm font-medium border border-slate-200"
                >
                  <Shield className="w-4 h-4" />
                  User Audit
                </button>
              </div>
            </AdminPanel>
            {/* Alerts & Actions */}
            <AdminPanel
              title="Alerts & Actions"
              subtitle="System controls"
              icon={Zap}
              iconColor="yellow"
            >
              <button
                onClick={handleBroadcastAlert}
                className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-4 rounded-xl bg-linear-to-r from-red-600 to-orange-600 text-white font-bold hover:from-red-700 hover:to-orange-700 transition-all duration-200 shadow-lg shadow-red-500/30 group"
              >
                <Bell className="w-5 h-5 group-hover:animate-pulse" />
                Broadcast Alert
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button className="flex flex-col items-center gap-2 p-3 rounded-xl bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-xs font-medium">Emergency Alert</span>
                </button>
                <button className="flex flex-col items-center gap-2 p-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                  <Lock className="w-5 h-5" />
                  <span className="text-xs font-medium">Area Lockdown</span>
                </button>
                <button className="flex flex-col items-center gap-2 p-3 rounded-xl bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors">
                  <Activity className="w-5 h-5" />
                  <span className="text-xs font-medium">System Notice</span>
                </button>
                <button className="flex flex-col items-center gap-2 p-3 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-xs font-medium">Clear Alert</span>
                </button>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-500 mb-2 font-semibold uppercase tracking-wider">
                  Recent Alerts
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    <span className="text-slate-700 font-medium">
                      High heat detected in Korangi
                    </span>
                    <span className="text-xs text-slate-400 ml-auto">
                      10 min ago
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                    <span className="text-slate-700 font-medium">
                      Water shortage reported in Saddar
                    </span>
                    <span className="text-xs text-slate-400 ml-auto">
                      25 min ago
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                    <span className="text-slate-700 font-medium">
                      Infrastructure issue in Landhi
                    </span>
                    <span className="text-xs text-slate-400 ml-auto">
                      1 hr ago
                    </span>
                  </div>
                </div>
              </div>
            </AdminPanel>
          </div>
          {/* Heat Map Overview */}
          <AdminPanel
            title="Heat Map Overview"
            subtitle="Live heat intelligence"
            icon={Map}
            iconColor="orange"
            action
            actionLabel="View Full Map"
            onAction={() => navigate('/admin/heatmap')}
          >
            <div className="relative h-64 rounded-xl overflow-hidden bg-slate-100">
              {/* Map placeholder with heat spots */}
              <div className="absolute inset-0 bg-white">
                {/* Simulated map grid */}
                <div className="absolute inset-0 opacity-20">
                  <svg width="100%" height="100%">
                    <defs>
                      <pattern
                        id="grid"
                        width="40"
                        height="40"
                        patternUnits="userSpaceOnUse"
                      >
                        <path
                          d="M 40 0 L 0 0 0 40"
                          fill="none"
                          stroke="#e5e7eb"
                          strokeWidth="0.5"
                        />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                  </svg>
                </div>
                {/* Heat spots */}
                <div className="absolute top-1/4 left-1/4 w-20 h-20 rounded-full bg-red-500/30 blur-xl animate-pulse"></div>
                <div className="absolute top-1/3 right-1/3 w-16 h-16 rounded-full bg-orange-500/30 blur-xl"></div>
                <div className="absolute bottom-1/3 left-1/3 w-12 h-12 rounded-full bg-yellow-500/30 blur-xl"></div>
                <div className="absolute top-1/2 right-1/4 w-14 h-14 rounded-full bg-orange-500/30 blur-xl animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/3 w-10 h-10 rounded-full bg-red-600/40 blur-xl"></div>
                {/* Area labels */}
                <div className="absolute top-1/4 left-1/4 transform -translate-x-1/2 -translate-y-1/2">
                  <span className="px-2 py-1 bg-white/90 shadow-sm border border-slate-200 rounded text-xs text-slate-900 font-bold">
                    Korangi
                  </span>
                </div>
                <div className="absolute top-1/2 left-1/3 transform -translate-x-1/2 -translate-y-1/2">
                  <span className="px-2 py-1 bg-white/90 shadow-sm border border-slate-200 rounded text-xs text-slate-900 font-bold">
                    Saddar
                  </span>
                </div>
                <div className="absolute top-1/3 right-1/4 transform -translate-x-1/2 -translate-y-1/2">
                  <span className="px-2 py-1 bg-white/90 shadow-sm border border-slate-200 rounded text-xs text-slate-900 font-bold">
                    Gulshan
                  </span>
                </div>
                <div className="absolute bottom-1/3 left-1/3 transform -translate-x-1/2 -translate-y-1/2">
                  <span className="px-2 py-1 bg-white/90 shadow-sm border border-slate-200 rounded text-xs text-slate-900 font-bold">
                    DHA
                  </span>
                </div>
                <div className="absolute bottom-1/4 right-1/3 transform -translate-x-1/2 -translate-y-1/2">
                  <span className="px-2 py-1 bg-white/90 shadow-sm border border-slate-200 rounded text-xs text-slate-900 font-bold">
                    Landhi
                  </span>
                </div>
              </div>
              {/* Legend */}
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-xl p-3 border border-gray-200 shadow-sm">
                <p className="text-xs text-slate-900 font-bold mb-2 uppercase tracking-wider">
                  Heat Intensity
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-600"></span>
                    <span className="text-xs text-slate-600 font-medium">
                      5 - Critical
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                    <span className="text-xs text-slate-600 font-medium">
                      4 - High
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                    <span className="text-xs text-slate-600 font-medium">
                      3 - Moderate
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                    <span className="text-xs text-slate-600 font-medium">
                      2 - Low
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                    <span className="text-xs text-slate-600 font-medium">
                      1 - Safe
                    </span>
                  </div>
                </div>
              </div>
              {/* Layer toggles */}
              <div className="absolute bottom-4 right-4 flex items-center gap-2">
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/90 backdrop-blur-sm border border-slate-200 text-xs text-slate-900 shadow-sm hover:bg-slate-50 transition-colors font-semibold">
                  <span className="w-2 h-2 rounded-sm bg-red-600"></span>
                  Heatmap
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/90 backdrop-blur-sm border border-slate-200 text-xs text-slate-500 shadow-sm hover:bg-slate-50 transition-colors font-semibold">
                  <span className="w-2 h-2 rounded-sm bg-green-500"></span>
                  Reports
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/90 backdrop-blur-sm border border-slate-200 text-xs text-slate-500 shadow-sm hover:bg-slate-50 transition-colors font-semibold">
                  <span className="w-2 h-2 rounded-sm bg-green-500"></span>
                  Hotspots
                </button>
              </div>
            </div>
          </AdminPanel>
        </div>
        {/* Right Column - Live Activity Feed */}
        <div className="space-y-6">
          {/* Live Activity Feed */}
          <AdminPanel
            title="Live Activity Feed"
            subtitle="Real-time system events"
            icon={Activity}
            iconColor="green"
            className="h-125 flex flex-col"
          >
            <ActivityFeed />
          </AdminPanel>
          {/* System Analytics */}
          <AdminPanel
            title="System Analytics"
            subtitle="Last 7 days"
            icon={TrendingUp}
            iconColor="purple"
            action
            actionLabel="View Analytics"
            onAction={() => navigate('/admin/analytics')}
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                    Report Volume
                  </span>
                </div>
                <p className="text-2xl font-bold text-slate-900">186</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                  <span className="text-xs text-emerald-500 font-bold">
                    +18%
                  </span>
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-xs">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <span className="text-xs text-slate-500">Avg. Severity</span>
                </div>
                <p className="text-2xl font-bold text-slate-900">3.9</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3 text-red-500" />
                  <span className="text-xs text-red-500 font-bold">+8%</span>
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="w-4 h-4 text-orange-600" />
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                    Active Hotspots
                  </span>
                </div>
                <p className="text-2xl font-bold text-slate-900">23</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3 text-red-500" />
                  <span className="text-xs text-red-500 font-bold">+27%</span>
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-xs">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-slate-500">
                    User Engagement
                  </span>
                </div>
                <p className="text-2xl font-bold text-slate-900">78%</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                  <span className="text-xs text-emerald-500 font-bold">
                    +12%
                  </span>
                </div>
              </div>
            </div>
            {/* Mini trend chart */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium">
                  Heat Trend Over Time
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Average Temperature (°C)
                </span>
              </div>
              <div className="h-24">
                <svg
                  viewBox="0 0 200 60"
                  preserveAspectRatio="none"
                  className="w-full h-full"
                >
                  <defs>
                    <linearGradient
                      id="trendGradient"
                      x1="0%"
                      y1="0%"
                      x2="0%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor="#FF6B35" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#FF6B35" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <polygon
                    fill="url(#trendGradient)"
                    points="0,60 0,40 28,35 57,38 85,32 114,28 142,35 171,25 200,15 200,60"
                  />
                  <polyline
                    fill="none"
                    stroke="#FF6B35"
                    strokeWidth="2"
                    points="0,40 28,35 57,38 85,32 114,28 142,35 171,25 200,15"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Data points */}
                  {[
                    [0, 40],
                    [28, 35],
                    [57, 38],
                    [85, 32],
                    [114, 28],
                    [142, 35],
                    [171, 25],
                    [200, 15],
                  ].map(([x, y], i) => (
                    <circle key={i} cx={x} cy={y} r="3" fill="#FF6B35" />
                  ))}
                </svg>
              </div>
              <div className="flex justify-between text-xs text-slate-400 font-medium mt-2">
                <span>24 Apr</span>
                <span>25 Apr</span>
                <span>26 Apr</span>
                <span>27 Apr</span>
                <span>28 Apr</span>
                <span>29 Apr</span>
                <span>30 Apr</span>
              </div>
            </div>
          </AdminPanel>
        </div>
      </div>
    </div>
  );
}
export default AdminDashboard;
