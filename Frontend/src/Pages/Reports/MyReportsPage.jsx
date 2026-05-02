import { useState, useCallback } from 'react';
import Badge from '../../components/ui/Badge';
import { ErrorState, SkeletonBlocks } from '../../components/ui/DataState';
import Panel from '../../components/ui/Panel';
import SectionHeading from '../../components/ui/SectionHeading';
import useApiResource from '../../hooks/api/useApiResource';
import { fetchMyReports, deleteMyReport, formatTimestamp } from '../../services/api';
import { FileText, CheckCircle, Clock, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
function MyReports() {
  const reportsState = useApiResource(fetchMyReports);
  const data = reportsState.data;
  const [filter, setFilter] = useState('all');
  const [deletingId, setDeletingId] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, reportId: null, reportArea: '' });

  // Check if report is within 24 hours
  const isWithin24Hours = (timestamp) => {
    const reportTime = new Date(timestamp).getTime();
    const now = Date.now();
    const hoursDiff = (now - reportTime) / (1000 * 60 * 60);
    return hoursDiff <= 24;
  };

  // Open delete confirmation modal
  const openDeleteModal = (report) => {
    setDeleteModal({ isOpen: true, reportId: report.id, reportArea: report.area });
  };

  // Close delete modal
  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, reportId: null, reportArea: '' });
  };

  // Confirm and delete report
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
  const filteredReports = data?.reports
    ? data.reports.filter((r) => {
        if (filter === 'all') return true;
        if (filter === 'validated') return r.status === 'Validated';
        if (filter === 'pending') return r.status === 'Pending';
        return true;
      })
    : [];
  const statusCounts = data?.reports
    ? {
        all: data.reports.length,
        validated: data.reports.filter((r) => r.status === 'Validated').length,
        pending: data.reports.filter((r) => r.status === 'Pending').length,
      }
    : { all: 0, validated: 0, pending: 0 };
  const getSeverityColor = (severity) => {
    if (severity >= 4) return 'text-red-600 bg-red-50';
    if (severity === 3) return 'text-orange-600 bg-orange-50';
    return 'text-green-600 bg-green-50';
  };
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Reports</h1>
          <p className="text-slate-600 mt-1">
            Track your submitted heat reports and their validation status
          </p>
        </div>
        {data && (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-xl">
            <FileText className="w-4 h-4 text-green-600" />
            <span className="text-sm font-semibold text-green-700">
              {data.reports.length} Reports
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
            eyebrow={data.user.role}
            title={data.user.name}
            description={`Signed in as ${data.user.email}`}
          />
          {/* Filter Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {[
              {
                key: 'all',
                label: 'All',
                count: statusCounts.all,
                icon: FileText,
              },
              {
                key: 'validated',
                label: 'Validated',
                count: statusCounts.validated,
                icon: CheckCircle,
              },
              {
                key: 'pending',
                label: 'Pending',
                count: statusCounts.pending,
                icon: Clock,
              },
            ].map(({ key, label, count, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filter === key
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-3 h-3" />
                {label}
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">
                  {count}
                </span>
              </button>
            ))}
          </div>
          {/* Deletion Policy Note */}
          <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-green-600" />
            <p>
              Reports can be deleted within <strong>24 hours</strong> of submission. After that, they become permanent.
            </p>
          </div>

          {/* Reports List */}
          <div className="space-y-3">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="rounded-xl border border-slate-200 bg-white p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900">
                        {report.area}
                      </p>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getSeverityColor(
                          report.severity
                        )}`}
                      >
                        S{report.severity}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {report.description}
                    </p>
                    <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                      {formatTimestamp(report.timestamp)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        report.status === 'Validated'
                          ? 'success'
                          : report.status === 'Pending'
                            ? 'warning'
                            : 'info'
                      }
                    >
                      {report.status}
                    </Badge>
                    {isWithin24Hours(report.timestamp) && (
                      <button
                        onClick={() => openDeleteModal(report)}
                        disabled={deletingId === report.id}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete report (available for 24 hours)"
                      >
                        {deletingId === report.id ? (
                          <div className="w-3 h-3 border-2 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filteredReports.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                No reports match the selected filter
              </div>
            )}
          </div>
        </Panel>
      ) : null}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 animate-in fade-in zoom-in duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="w-7 h-7 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Delete Report?
              </h3>
              <p className="text-slate-600 mb-1">
                Are you sure you want to delete the report for
              </p>
              <p className="font-semibold text-slate-900 mb-6">
                {deleteModal.reportArea}?
              </p>
              <p className="text-sm text-slate-500 mb-6">
                This action cannot be undone. Reports can only be deleted within 24 hours.
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={closeDeleteModal}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deletingId === deleteModal.reportId}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {deletingId === deleteModal.reportId ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </>
                  )}
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
