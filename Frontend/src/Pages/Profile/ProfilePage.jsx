import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Mail, Shield, Calendar, FileText, MapPin, Thermometer, CheckCircle, ArrowLeft } from 'lucide-react';
import { fetchMyReports } from '../../services/api';
import { toast } from 'react-hot-toast';
import Panel from '../../components/ui/Panel';
import SectionHeading from '../../components/ui/SectionHeading';

function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalReports: 0,
    validatedReports: 0,
    pendingReports: 0,
    avgSeverity: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserStats();
  }, []);

  const loadUserStats = async () => {
    try {
      const data = await fetchMyReports();
      const reports = data.reports || [];
      const validated = reports.filter((r) => r.status === 'Validated').length;
      const pending = reports.filter((r) => r.status === 'Pending').length;
      const avgSeverity = reports.length > 0
        ? (reports.reduce((sum, r) => sum + (r.severity || 0), 0) / reports.length).toFixed(1)
        : 0;

      setStats({
        totalReports: reports.length,
        validatedReports: validated,
        pendingReports: pending,
        avgSeverity,
      });
    } catch (err) {
      toast.error('Failed to load user statistics');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (role) => {
    if (role === 'ADMIN') return 'bg-purple-100 text-purple-700';
    return 'bg-green-100 text-green-700';
  };

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-slate-200 px-1 pb-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[2rem] leading-none font-bold text-slate-900">My Profile</h1>
            <p className="text-sm text-slate-600">
              View and manage your account information
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 self-start rounded-xl bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 transition-colors hover:bg-green-100 sm:self-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 px-1">
        <div className="grid h-full gap-3 lg:grid-cols-[280px_minmax(0,1fr)]">
          {/* Profile Card */}
          <div className="h-full overflow-y-auto lg:overflow-hidden">
            <Panel padding="none" className="flex h-full w-full flex-col justify-between rounded-[1.75rem] px-4 py-4">
              <div className="flex flex-col items-center text-center">
                <div className="mb-2 flex h-20 w-20 items-center justify-center rounded-full bg-linear-to-tr from-green-600 to-green-700 text-[2rem] font-bold text-white shadow-lg">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <h2 className="text-[1.05rem] font-bold text-slate-900">{user?.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{user?.email}</p>
                <span className={`mt-2 rounded-full px-3 py-1 text-xs font-semibold ${getRoleBadgeColor(user?.role)}`}>
                  {user?.role}
                </span>
              </div>

              <div className="mt-4 grid gap-2">
                <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
                    <Mail className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">Email</p>
                    <p className="truncate text-sm font-medium text-slate-900">
                      {user?.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
                    <Shield className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Role</p>
                    <p className="text-sm font-medium text-slate-900">{user?.role}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                    <Calendar className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Member Since</p>
                    <p className="text-sm font-medium text-slate-900">April 2025</p>
                  </div>
                </div>
              </div>
            </Panel>
          </div>

          {/* Statistics */}
          <div className="flex min-h-0 flex-col gap-3 overflow-hidden">
            <div className="shrink-0">
              <SectionHeading
                title="Report Statistics"
                subtitle="Overview of your heat report submissions"
              />
            </div>

            <div className="grid shrink-0 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Total</p>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
                  <FileText className="h-4 w-4 text-green-600" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-slate-900">
                  {loading ? '...' : stats.totalReports}
                </p>
                <p className="text-sm text-slate-500">Reports</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Validated</p>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-slate-900">
                  {loading ? '...' : stats.validatedReports}
                </p>
                <p className="text-sm text-slate-500">Approved reports</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Pending</p>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                  <MapPin className="h-4 w-4 text-amber-600" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-slate-900">
                  {loading ? '...' : stats.pendingReports}
                </p>
                <p className="text-sm text-slate-500">In moderation</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Avg Severity</p>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
                  <Thermometer className="h-4 w-4 text-red-600" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-slate-900">
                  {loading ? '...' : stats.avgSeverity}
                </p>
                <p className="text-sm text-slate-500">Heat level</p>
              </div>
            </div>
          </div>

          {/* Recent Activity Placeholder */}
          <Panel padding="none" className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.75rem] px-4 py-4">
            <h3 className="mb-3 shrink-0 text-lg font-semibold text-slate-900">Recent Activity</h3>
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="grid gap-2">
                <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-3">
                  <div className="h-2.5 w-2.5 rounded-full bg-green-500"></div>
                  <p className="flex-1 text-sm text-slate-600">Profile viewed</p>
                  <p className="text-xs text-slate-400">Just now</p>
                </div>
                {loading ? (
                  <div className="py-3 text-center text-sm text-slate-500">Loading statistics...</div>
                ) : stats.totalReports === 0 ? (
                  <div className="py-4 text-center text-slate-500">
                    <FileText className="mx-auto mb-2 h-9 w-9 text-slate-300" />
                    <p>No reports submitted yet</p>
                    <p className="text-sm mt-1">Submit your first heat report to see activity</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-2xl border border-green-100 bg-green-50 px-3 py-3">
                    <div className="h-2.5 w-2.5 rounded-full bg-green-500"></div>
                    <p className="flex-1 text-sm text-slate-600">
                      Submitted {stats.totalReports} heat report{stats.totalReports !== 1 ? 's' : ''}
                    </p>
                    <p className="text-sm font-medium text-green-600">Active</p>
                  </div>
                )}
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  </div>
  );
}

export default ProfilePage;
