import { useState, useMemo } from 'react';
import Badge from '../../components/ui/Badge';
import { ErrorState, SkeletonBlocks } from '../../components/ui/DataState';
import Panel from '../../components/ui/Panel';
import SectionHeading from '../../components/ui/SectionHeading';
import useApiResource from '../../hooks/api/useApiResource';
import { fetchMyReports, deleteMyReport, formatTimestamp } from '../../services/api';
import {
  FileText,
  CheckCircle,
  Clock,
  Trash2,
  AlertTriangle,
  XCircle,
  ShieldAlert,
  Flag,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

function MyReports() {
  const reportsState = useApiResource(fetchMyReports);
  const data = reportsState.data;
  const [filter, setFilter] = useState('all');
  const [deletingId, setDeletingId] = useState(null);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    reportId: null,
    reportArea: '',
  });

  const openDeleteModal = (report) => {
    setDeleteModal({
      isOpen: true,
      reportId: report.id,
      reportArea: report.area,
    });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, reportId: null, reportArea: '' });
  };

  const confirmDelete = async () => {
    if (!deleteModal.reportId) return;
    setDeletingId(deleteModal.reportId);
    try {
      await deleteMyReport(deleteModal.reportId);
      toast.success('Report deleted successfully');
      closeDeleteModal();
      reportsState.reload();
    } catch (err) {
      toast.error(err.message || 'Failed to delete report');
    } finally {
      setDeletingId(null);
    }
  };

  // Normalize all reports to standard schema
  const normalizedReports = useMemo(() => {
    const rawList = data?.reports || [];
    return rawList.map((r) => ({
      ...r,
      id: r._id || r.id,
      area: r.areaName || r.area || 'Unknown area',
      severity: r.severityLevel || r.severity || 3,
      status: (r.status || 'pending').toLowerCase(),
      timestamp: r.createdAt || r.timestamp,
    }));
  }, [data]);

  const statusCounts = useMemo(() => {
    return {
      all: normalizedReports.length,
      // 'validated' kept as a legacy alias of 'verified' for old records
      verified: normalizedReports.filter(
        (r) => r.status === 'verified' || r.status === 'validated'
      ).length,
      pending: normalizedReports.filter((r) => r.status === 'pending').length,
      flagged: normalizedReports.filter((r) => r.status === 'flagged').length,
      rejected: normalizedReports.filter((r) => r.status === 'rejected').length,
    };
  }, [normalizedReports]);

  const filteredReports = useMemo(() => {
    return normalizedReports.filter((r) => {
      if (filter === 'all') return true;
      if (filter === 'verified')
        return r.status === 'verified' || r.status === 'validated';
      if (filter === 'pending') return r.status === 'pending';
      if (filter === 'flagged') return r.status === 'flagged';
      if (filter === 'rejected') return r.status === 'rejected';
      return true;
    });
  }, [normalizedReports, filter]);

  const getSeverityColor = (severity) => {
    if (severity >= 4) return 'text-red-700 bg-red-100 border border-red-200';
    if (severity === 3) return 'text-orange-700 bg-orange-100 border border-orange-200';
    return 'text-emerald-700 bg-emerald-100 border border-emerald-200';
  };

  const renderStatusBadge = (status) => {
    if (status === 'verified' || status === 'validated') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
          Verified
        </span>
      );
    }
    if (status === 'flagged') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
          <Flag className="w-3.5 h-3.5 text-amber-600" />
          Flagged
        </span>
      );
    }
    if (status === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
          <XCircle className="w-3.5 h-3.5 text-red-600" />
          Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
        <Clock className="w-3.5 h-3.5 text-amber-600" />
        Under Review
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Heat Reports</h1>
          <p className="text-slate-600 mt-1">
            Track your submitted citizen heat reports and their administrator validation status
          </p>
        </div>
        {data && (
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
            <FileText className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-800">
              {normalizedReports.length} Submissions
            </span>
          </div>
        )}
      </div>

      {reportsState.loading && !data ? (
        <SkeletonBlocks count={3} />
      ) : reportsState.error ? (
        <ErrorState onRetry={reportsState.reload} />
      ) : data ? (
        <Panel className="space-y-6">
          {/* User Info */}
          <SectionHeading
            eyebrow={data.user?.role || 'Citizen'}
            title={data.user?.fullName || data.user?.name || 'Citizen Contributor'}
            description={`Signed in as ${data.user?.email || ''}`}
          />

          {/* Filter Pills with real counts */}
          <div className="flex items-center gap-2 flex-wrap">
            {[
              {
                key: 'all',
                label: 'All Reports',
                count: statusCounts.all,
                icon: FileText,
                activeColor: 'bg-slate-900 text-white',
              },
              {
                key: 'pending',
                label: 'Under Review',
                count: statusCounts.pending,
                icon: Clock,
                activeColor: 'bg-amber-600 text-white',
              },
              {
                key: 'verified',
                label: 'Verified',
                count: statusCounts.verified,
                icon: CheckCircle,
                activeColor: 'bg-emerald-600 text-white',
              },
              {
                key: 'flagged',
                label: 'Flagged',
                count: statusCounts.flagged,
                icon: Flag,
                activeColor: 'bg-amber-500 text-white',
              },
              {
                key: 'rejected',
                label: 'Rejected',
                count: statusCounts.rejected,
                icon: XCircle,
                activeColor: 'bg-red-600 text-white',
              },
            ].map(({ key, label, count, icon: Icon, activeColor }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  filter === key
                    ? `${activeColor} shadow-xs`
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
                <span
                  className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${
                    filter === key ? 'bg-white/20' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            ))}
          </div>

          {/* Policy Note */}
          <div className="flex items-start gap-2.5 p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-800">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <p>
              Community reports are moderated to prevent fraudulent or duplicate heat anomalies. Unverified submissions are marked as <strong>Rejected</strong> and excluded from public heat maps.
            </p>
          </div>

          {/* Reports List */}
          <div className="space-y-3">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <p className="font-bold text-slate-900 text-base">
                        {report.area}
                      </p>
                      <span
                        className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${getSeverityColor(
                          report.severity
                        )}`}
                      >
                        Severity L{report.severity}
                      </span>
                    </div>

                    <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                      {report.description || 'Heat vulnerability observation submitted via mobile report.'}
                    </p>

                    <p className="mt-2 text-xs font-semibold text-slate-400">
                      Submitted on {formatTimestamp(report.timestamp)}
                    </p>

                    {/* Explanatory banner if Rejected */}
                    {report.status === 'rejected' && (
                      <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2.5">
                        <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">Status: Rejected by Moderator</p>
                          <p className="text-[11px] text-red-700 mt-0.5 leading-normal">
                            This report did not meet validation criteria (e.g. duplicate coordinates or insufficient thermal threshold). It has been removed from active moderation queues and public map clusters.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0">
                    {renderStatusBadge(report.status)}

                    {/* Only pending reports can be deleted by the owner (backend policy) */}
                    {report.status === 'pending' && (
                      <button
                        onClick={() => openDeleteModal(report)}
                        disabled={deletingId === report.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-50"
                        title="Delete report (only pending reports can be deleted)"
                      >
                        {deletingId === report.id ? (
                          <div className="w-3 h-3 border-2 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {filteredReports.length === 0 && (
              <div className="text-center py-12 rounded-xl border border-dashed border-slate-200 text-slate-500">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700 text-sm">No reports in this category</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Try switching between All, Under Review, Verified, Flagged, or Rejected filters.
                </p>
              </div>
            )}
          </div>
        </Panel>
      ) : null}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 animate-fade-in duration-150">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">
                Delete Heat Report?
              </h3>
              <p className="text-xs text-slate-600 mb-4">
                Are you sure you want to remove your submission for <span className="font-bold text-slate-800">{deleteModal.reportArea}</span>? Only pending reports can be deleted.
              </p>
              <div className="flex gap-2.5 w-full">
                <button
                  onClick={closeDeleteModal}
                  className="flex-1 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deletingId === deleteModal.reportId}
                  className="flex-1 px-4 py-2 text-xs font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {deletingId === deleteModal.reportId ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyReports;
