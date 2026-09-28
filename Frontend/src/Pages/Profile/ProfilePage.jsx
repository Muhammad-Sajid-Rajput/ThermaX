import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import {
  Mail,
  Shield,
  Calendar,
  FileText,
  MapPin,
  Thermometer,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  ArrowLeft,
  ArrowRight,
  Flag,
  Flame,
  CheckCircle2,
  Phone,
  Building2,
  ExternalLink,
} from 'lucide-react';
import { fetchMyReports, fetchCurrentUser, formatTimestamp } from '../../services/api';
import { toast } from 'react-hot-toast';
import Panel from '../../components/ui/Panel';
import SectionHeading from '../../components/ui/SectionHeading';

function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profileUser, setProfileUser] = useState(user);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Sync profileUser with AuthContext and fetch /me if createdAt is missing
  useEffect(() => {
    if (user) {
      setProfileUser((prev) => ({ ...prev, ...user }));
    }
    fetchCurrentUser()
      .then((freshUser) => {
        if (freshUser) {
          setProfileUser((prev) => ({ ...prev, ...freshUser }));
        }
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    loadUserReports();
  }, []);

  const loadUserReports = async () => {
    try {
      setLoading(true);
      const data = await fetchMyReports();
      const list = data?.reports || [];
      setReports(list);
    } catch {
      toast.error('Failed to load user statistics');
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const total = reports.length;
    const verified = reports.filter(
      (r) => (r.status || '').toLowerCase() === 'verified' || (r.status || '').toLowerCase() === 'validated'
    ).length;
    const pending = reports.filter(
      (r) => (r.status || '').toLowerCase() === 'pending'
    ).length;
    const flagged = reports.filter(
      (r) => (r.status || '').toLowerCase() === 'flagged' || (r.status || '').toLowerCase() === 'anomaly'
    ).length;
    const rejected = reports.filter(
      (r) => (r.status || '').toLowerCase() === 'rejected'
    ).length;

    const withSev = reports.filter(
      (r) => (r.severityLevel ?? r.severity) != null
    );
    const avgSeverity = withSev.length > 0
      ? (withSev.reduce((sum, r) => sum + Number(r.severityLevel ?? r.severity), 0) / withSev.length).toFixed(1)
      : 'N/A';

    return {
      totalReports: total,
      verifiedReports: verified,
      pendingReports: pending,
      flaggedReports: flagged,
      rejectedReports: rejected,
      flaggedOrRejected: flagged + rejected,
      avgSeverity,
    };
  }, [reports]);

  const getRoleBadge = (role) => {
    const normalized = String(role || '').toUpperCase();
    if (normalized === 'ADMIN') {
      return {
        label: 'Administrator',
        className: 'bg-purple-100 text-purple-800 border border-purple-200',
      };
    }
    return {
      label: 'Citizen Contributor',
      className: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    };
  };

  const renderStatusBadge = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'verified' || s === 'validated') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
          Verified
        </span>
      );
    }
    if (s === 'flagged' || s === 'anomaly') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
          <Flag className="w-3.5 h-3.5 text-amber-600" />
          Flagged
        </span>
      );
    }
    if (s === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
          <XCircle className="w-3.5 h-3.5 text-red-600" />
          Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        <Clock className="w-3.5 h-3.5 text-slate-500" />
        Pending
      </span>
    );
  };

  const getSeverityBadge = (severity) => {
    const sev = Number(severity) || 1;
    if (sev >= 4) return 'bg-red-50 text-red-700 border-red-200';
    if (sev === 3) return 'bg-orange-50 text-orange-700 border-orange-200';
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  };

  const roleInfo = getRoleBadge(profileUser?.role);

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-slate-200 px-1 pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">My Profile</h1>
            <p className="text-sm text-slate-500">
              Manage your identity, credentials, and track your thermal contribution history
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-xs transition-colors hover:bg-slate-50 hover:text-slate-900 sm:self-auto cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 px-1">
        <div className="grid h-full gap-4 lg:grid-cols-[330px_minmax(0,1fr)]">
          {/* Profile Identity Card */}
          <div className="h-full overflow-y-auto">
            <Panel padding="none" className="flex h-full w-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div>
                <div className="flex flex-col items-center text-center pb-4 border-b border-slate-100">
                  <div className="relative mb-3 flex h-20 w-20 items-center justify-center rounded-2xl bg-linear-to-tr from-emerald-600 via-green-600 to-teal-500 text-3xl font-extrabold text-white shadow-md shadow-emerald-500/20">
                    {profileUser?.name?.charAt(0)?.toUpperCase() || 'U'}
                    <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-400/40" title="Active Account" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 leading-tight">
                    {profileUser?.name || 'ThermaX User'}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 break-all px-2 max-w-full font-mono" title={profileUser?.email}>
                    {profileUser?.email}
                  </p>
                  <div className="mt-2.5 flex items-center gap-1.5 flex-wrap justify-center">
                    <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold ${roleInfo.className}`}>
                      {roleInfo.label}
                    </span>
                    {profileUser?.isEmailVerified && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Verified
                      </span>
                    )}
                  </div>
                </div>

                {/* Profile Details List */}
                <div className="mt-4 space-y-2.5">
                  {/* Email */}
                  <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100/70 text-emerald-700 mt-0.5">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Email Address</p>
                      <p className="text-xs font-semibold text-slate-800 break-all leading-snug mt-0.5" title={profileUser?.email}>
                        {profileUser?.email || '—'}
                      </p>
                    </div>
                  </div>

                  {/* Role */}
                  <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-100/70 text-purple-700 mt-0.5">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Access Level</p>
                      <p className="text-xs font-semibold text-slate-800 mt-0.5">
                        {String(profileUser?.role || 'USER').toUpperCase() === 'ADMIN' ? 'Platform Administrator' : 'Citizen Contributor'}
                      </p>
                    </div>
                  </div>

                  {/* Member Since */}
                  <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100/70 text-amber-700 mt-0.5">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Member Since</p>
                      <p className="text-xs font-semibold text-slate-800 mt-0.5">
                        {profileUser?.createdAt
                          ? new Date(profileUser.createdAt).toLocaleDateString(undefined, {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'Recent Contributor'}
                      </p>
                    </div>
                  </div>

                  {/* Phone (if available) */}
                  {profileUser?.phone && (
                    <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100/70 text-blue-700 mt-0.5">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Phone</p>
                        <p className="text-xs font-semibold text-slate-800 mt-0.5">{profileUser.phone}</p>
                      </div>
                    </div>
                  )}

                  {/* Organization (if available) */}
                  {profileUser?.organization && (
                    <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-100/70 text-teal-700 mt-0.5">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Organization</p>
                        <p className="text-xs font-semibold text-slate-800 mt-0.5">{profileUser.organization}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100">
                <Link
                  to="/report"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-emerald-700"
                >
                  <Flame className="w-4 h-4" />
                  Submit New Heat Report
                </Link>
              </div>
            </Panel>
          </div>

          {/* Right Main Column (Statistics & Real Activity) */}
          <div className="flex min-h-0 flex-col gap-4 overflow-hidden">
            {/* Report Statistics Cards */}
            <div className="shrink-0">
              <SectionHeading
                title="Report Statistics"
                subtitle="Overview and lifecycle metrics of your urban heat submissions"
              />
            </div>

            <div className="grid shrink-0 gap-3 grid-cols-2 lg:grid-cols-5">
              {/* Total Reports */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total</p>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <FileText className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-2xl font-bold text-slate-900">
                    {loading ? '...' : stats.totalReports}
                  </p>
                  <span className="text-xs text-slate-500">Submitted</span>
                </div>
              </div>

              {/* Verified */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Verified</p>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100/70 text-emerald-600">
                    <CheckCircle className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-2xl font-bold text-slate-900">
                    {loading ? '...' : stats.verifiedReports}
                  </p>
                  <span className="text-xs text-slate-500">QC Passed</span>
                </div>
              </div>

              {/* Pending */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Pending</p>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100/70 text-amber-600">
                    <Clock className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-2xl font-bold text-slate-900">
                    {loading ? '...' : stats.pendingReports}
                  </p>
                  <span className="text-xs text-slate-500">In Review</span>
                </div>
              </div>

              {/* Flagged / Rejected */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-red-600 uppercase tracking-wider">Flagged/Reject</p>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100/70 text-red-600">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-2xl font-bold text-slate-900">
                    {loading ? '...' : stats.flaggedOrRejected}
                  </p>
                  <span className="text-xs text-slate-500">Requires review</span>
                </div>
              </div>

              {/* Average Severity */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs col-span-2 lg:col-span-1">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-orange-600 uppercase tracking-wider">Avg Severity</p>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100/70 text-orange-600">
                    <Thermometer className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-2xl font-bold text-slate-900">
                    {loading ? '...' : stats.avgSeverity}
                  </p>
                  <span className="text-xs text-slate-500">{stats.avgSeverity !== 'N/A' ? '/ 5.0' : ''}</span>
                </div>
              </div>
            </div>

            {/* Real Recent Activity Feed */}
            <Panel padding="none" className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="mb-3 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Recent Report Activity</h3>
                  <p className="text-xs text-slate-500">Live submissions recorded under your citizen profile</p>
                </div>
                {reports.length > 0 && (
                  <button
                    onClick={() => navigate('/my-reports')}
                    className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
                  >
                    View All ({reports.length})
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-2.5">
                {loading ? (
                  <div className="py-8 text-center text-sm text-slate-500">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent mb-2" />
                    <p>Loading your thermal contributions...</p>
                  </div>
                ) : reports.length === 0 ? (
                  <div className="py-10 text-center text-slate-500 flex flex-col items-center">
                    <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                      <FileText className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-800">No reports submitted yet</p>
                    <p className="text-xs text-slate-500 mt-0.5 max-w-sm">
                      Citizen reports help calibrate satellite thermal imagery and detect urban heat islands in your neighborhood.
                    </p>
                    <Link
                      to="/report"
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                    >
                      <Flame className="w-3.5 h-3.5" />
                      Submit First Report
                    </Link>
                  </div>
                ) : (
                  reports.slice(0, 5).map((r) => {
                    const sev = r.severityLevel ?? r.severity ?? 3;
                    const ref = r.reportRef || (r._id ? `#${r._id.slice(-6)}` : '#REPORT');
                    const area = r.district || r.areaName || r.city || 'Urban Area';
                    const category = String(r.category || 'Urban Heat').replace(/_/g, ' ');

                    return (
                      <div
                        key={r._id || r.id}
                        onClick={() => navigate('/my-reports')}
                        className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-slate-50/60 hover:bg-emerald-50/40 hover:border-emerald-200 p-3.5 transition-all cursor-pointer"
                      >
                        <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border font-mono font-bold text-xs ${getSeverityBadge(sev)}`}>
                            {sev}/5
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold text-slate-900 group-hover:text-emerald-700">
                                {ref}
                              </span>
                              <span className="text-xs text-slate-400">•</span>
                              <span className="text-xs font-medium text-slate-700 capitalize">
                                {category}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                              <span className="flex items-center gap-1 truncate">
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                {area}
                              </span>
                              {r.ambientTemp != null && (
                                <span className="flex items-center gap-0.5 text-orange-600 font-medium shrink-0">
                                  <Thermometer className="w-3 h-3" />
                                  {r.ambientTemp}°C
                                </span>
                              )}
                              <span className="text-slate-400 shrink-0">
                                {formatTimestamp ? formatTimestamp(r.createdAt) : new Date(r.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 justify-between sm:justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                          {renderStatusBadge(r.status)}
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
