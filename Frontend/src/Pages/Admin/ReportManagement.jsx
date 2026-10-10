import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { AdminPanel, StatusBadge } from '../../components/admin';
import { toast } from 'react-hot-toast';
import {
  FileText,
  CheckCircle,
  XCircle,
  Eye,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  MapPin,
  Calendar,
  User,
  Image as ImageIcon,
  Tag,
} from 'lucide-react';
import { fetchReports, updateModerationStatus, formatTimestamp } from '../../services/api';
import { csvCell } from '../../utils/csv';

function ReportManagement() {
  const location = useLocation();
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [selectedReports, setSelectedReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
  });

  const flaggedSelectedCount = selectedReports.filter((id) =>
    reports.some((r) => r.id === id && r.status === 'flagged')
  ).length;

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchReports({
        status: filters.status === 'all' ? undefined : filters.status,
      });

      const raw = response?.data || [];
      const normalized = raw.map((r) => ({
        ...r,
        id: r._id || r.id,
        area: r.areaName || r.area || r.district || 'Unknown area',
        severity: r.severityLevel || r.severity || 3,
        status: (r.status || 'pending').toLowerCase(),
        submittedAt: r.createdAt || r.timestamp,
        userName: r.user?.fullName || r.user?.name || r.userName || 'Citizen User',
        userEmail: r.user?.email || r.userEmail || '',
        imageUrl: r.image || (Array.isArray(r.images) ? r.images[0] : null),
        causes: r.causes || r.likelyCauses || [],
      }));

      setReports(normalized);
      // Client-side filters (search) are applied by the effect below
      // which watches `reports` — calling applyFilters here directly would
      // capture a stale closure over `filters` (exhaustive-deps).
    } catch (err) {
      console.error('Failed to load reports:', err);
      toast.error('Failed to load real reports from database.');
      setReports([]);
      setFilteredReports([]);
    } finally {
      setLoading(false);
    }
  }, [filters.status]);

  const applyFilters = useCallback(
    (data = reports) => {
      let filtered = [...data];

      if (filters.status !== 'all') {
        filtered = filtered.filter((r) => r.status === filters.status.toLowerCase());
      } else {
        // In the default active queue, exclude rejected reports
        filtered = filtered.filter((r) => r.status !== 'rejected');
      }


      if (filters.search.trim()) {
        const q = filters.search.toLowerCase().trim();
        filtered = filtered.filter(
          (r) =>
            r.id?.toLowerCase().includes(q) ||
            r.reportRef?.toLowerCase().includes(q) ||
            r.area?.toLowerCase().includes(q) ||
            r.userName?.toLowerCase().includes(q) ||
            r.description?.toLowerCase().includes(q)
        );
      }

      setFilteredReports(filtered);
      setCurrentPage(1);
    },
    [reports, filters]
  );

  useEffect(() => {
    if (location.state?.search) {
      setFilters((prev) => ({
        ...prev,
        search: location.state.search,
        status: 'all',
      }));
    }
  }, [location.state]);

  useEffect(() => {
    if (location.state?.highlightReportId && reports.length > 0) {
      const match = reports.find(
        (r) =>
          String(r.id) === String(location.state.highlightReportId) ||
          String(r.reportRef) === String(location.state.highlightReportId)
      );
      if (match) {
        setShowDetailModal(match);
      }
    }
  }, [location.state, reports]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  useEffect(() => {
    applyFilters(reports);
  }, [filters.search, applyFilters, reports]);

  // Actions
  const handleReportAction = async (reportId, action) => {
    try {
      setActionLoadingId(reportId);
      // Phase 3 lifecycle vocabulary: verified | flagged | rejected.
      const decision =
        action === 'approve' ? 'verified' : action === 'flag' ? 'flagged' : 'rejected';

      // If rejected, immediately remove from active list in UI
      if (decision === 'rejected') {
        setReports((prev) => prev.filter((r) => r.id !== reportId));
        setFilteredReports((prev) => prev.filter((r) => r.id !== reportId));
      } else {
        setReports((prev) =>
          prev.map((r) => (r.id === reportId ? { ...r, status: decision } : r))
        );
        setFilteredReports((prev) =>
          prev.map((r) => (r.id === reportId ? { ...r, status: decision } : r))
        );
      }

      await updateModerationStatus(reportId, decision);
      toast.success(
        action === 'approve'
          ? 'Report verified & published'
          : action === 'flag'
            ? 'Report flagged for review'
            : 'Report rejected and removed from active list'
      );
      await loadReports();
      if (showDetailModal && showDetailModal.id === reportId) {
        setShowDetailModal((prev) => ({ ...prev, status: decision }));
      }
    } catch {
      toast.error('Moderation action failed. Please try again.');
      await loadReports();
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleBulkAction = async (action) => {
    // Bulk operations apply to flagged outlier reports only.
    const targets = selectedReports.filter((id) =>
      reports.some((r) => r.id === id && r.status === 'flagged')
    );
    if (targets.length === 0) {
      toast.error('Select at least one flagged outlier report.');
      return;
    }
    try {
      setActionLoadingId('bulk');
      const decision =
        action === 'approve' ? 'verified' : action === 'flag' ? 'flagged' : 'rejected';
      await Promise.all(targets.map((id) => updateModerationStatus(id, decision)));
      const label =
        action === 'approve' ? 'verified' : action === 'flag' ? 'flagged' : 'rejected';
      toast.success(`${targets.length} outlier report(s) ${label}`);
      setSelectedReports([]);
      await loadReports();
    } catch {
      toast.error('Bulk moderation failed.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const toggleReportSelection = (reportId) => {
    setSelectedReports((prev) =>
      prev.includes(reportId) ? prev.filter((id) => id !== reportId) : [...prev, reportId]
    );
  };

  const toggleAllSelection = () => {
    const flaggedItems = currentPageItems.filter((r) => r.status === 'flagged');
    const allFlaggedSelected =
      flaggedItems.length > 0 && flaggedItems.every((r) => selectedReports.includes(r.id));
    if (allFlaggedSelected) {
      setSelectedReports((prev) => prev.filter((id) => !flaggedItems.some((r) => r.id === id)));
    } else {
      setSelectedReports((prev) => [
        ...prev,
        ...flaggedItems.map((r) => r.id).filter((id) => !prev.includes(id)),
      ]);
    }
  };

  // Export CSV (formula-injection guard lives in utils/csv.js — tested).
  const handleExportCSV = () => {
    if (filteredReports.length === 0) {
      toast.error('No reports to export');
      return;
    }
    const headers = ['ID', 'Area', 'Severity', 'Status', 'User', 'Email', 'SubmittedAt'];
    const rows = filteredReports.map((r) => [
      csvCell(r.id),
      csvCell(r.area),
      r.severity ?? '',
      csvCell(r.status),
      csvCell(r.userName),
      csvCell(r.userEmail),
      csvCell(r.submittedAt),
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `thermax-reports-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Reports exported to CSV');
  };

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredReports.length / itemsPerPage));
  const currentPageItems = filteredReports.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const stats = {
    total: reports.length,
    pending: reports.filter((r) => r.status === 'pending').length,
    validated: reports.filter((r) => r.status === 'verified').length,
    flagged: reports.filter((r) => r.status === 'flagged').length,
    rejected: reports.filter((r) => r.status === 'rejected').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-6 h-6 text-emerald-600" />
            <h1 className="text-xl font-bold text-slate-900">Report Moderation</h1>
          </div>
          <p className="text-xs text-slate-500">
            Verification and flagging run automatically — manual actions appear only on
            flagged outliers
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={loadReports}
            disabled={loading}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-xs"
            title="Refresh reports"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors text-xs font-semibold shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Real Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 sm:gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
            Total Submissions
          </p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 shadow-xs">
          <p className="text-2xl font-bold text-amber-700">{stats.pending}</p>
          <p className="text-[11px] text-amber-700 font-semibold uppercase tracking-wider mt-0.5">
            Pending Auto-QC
          </p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 shadow-xs">
          <p className="text-2xl font-bold text-emerald-700">{stats.validated}</p>
          <p className="text-[11px] text-emerald-700 font-semibold uppercase tracking-wider mt-0.5">
            Verified
          </p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 shadow-xs">
          <p className="text-2xl font-bold text-amber-700">{stats.flagged}</p>
          <p className="text-[11px] text-amber-700 font-semibold uppercase tracking-wider mt-0.5">
            Flagged
          </p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 border border-red-100 shadow-xs">
          <p className="text-2xl font-bold text-red-700">{stats.rejected}</p>
          <p className="text-[11px] text-red-700 font-semibold uppercase tracking-wider mt-0.5">
            Rejected
          </p>
        </div>
      </div>

      {/* Filters & Bulk Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search reports or user..."
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
              className="pl-9 pr-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 transition-colors w-60"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, status: e.target.value }))
            }
            className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium focus:outline-none focus:border-emerald-600"
          >
            <option value="all">Active Queue (Pending, Verified & Flagged)</option>
            <option value="pending">Pending Auto-QC Only</option>
            <option value="verified">Verified Only</option>
            <option value="flagged">Flagged Only</option>
            <option value="rejected">Archived / Rejected</option>
          </select>
        </div>

        {/* Bulk Actions — outlier-only: visible when flagged reports are selected */}
        {flaggedSelectedCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">
              {flaggedSelectedCount} flagged selected
            </span>
            <button
              onClick={() => handleBulkAction('approve')}
              disabled={actionLoadingId === 'bulk'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-colors disabled:opacity-50"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Approve All</span>
            </button>
            <button
              onClick={() => handleBulkAction('reject')}
              disabled={actionLoadingId === 'bulk'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 text-xs font-semibold hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Reject All</span>
            </button>
          </div>
        )}
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={
                      currentPageItems.some((r) => r.status === 'flagged') &&
                      currentPageItems
                        .filter((r) => r.status === 'flagged')
                        .every((r) => selectedReports.includes(r.id))
                    }
                    onChange={toggleAllSelection}
                    disabled={!currentPageItems.some((r) => r.status === 'flagged')}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-600 disabled:opacity-30 cursor-pointer"
                    title="Select all flagged outliers on this page"
                  />
                </th>
                <th className="py-3 px-4">Location / Area</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Reported By</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="py-4 px-4">
                      <div className="h-6 bg-slate-100 rounded"></div>
                    </td>
                  </tr>
                ))
              ) : currentPageItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600 text-sm">No reports match your filters</p>
                    <p className="text-xs text-slate-400 mt-0.5">Try changing severity or status filters.</p>
                  </td>
                </tr>
              ) : (
                currentPageItems.map((r) => {
                  const isCritical = r.severity >= 5;
                  const isHigh = r.severity === 4;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-3.5 px-4">
                        <input
                          type="checkbox"
                          checked={selectedReports.includes(r.id)}
                          onChange={() => toggleReportSelection(r.id)}
                          disabled={r.status !== 'flagged'}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-600 disabled:opacity-20 cursor-pointer"
                          title={
                            r.status === 'flagged'
                              ? 'Select flagged outlier for review'
                              : 'Automatic QC applies; manual actions appear only on flagged outliers'
                          }
                        />
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-bold text-slate-900 truncate max-w-50">
                            {r.area}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                            isCritical
                              ? 'bg-red-100 text-red-700'
                              : isHigh
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          Level {r.severity}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <StatusBadge status={r.status} size="sm" pulse={r.status === 'pending'} />
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-800 truncate max-w-37.5">
                          {r.userName}
                        </p>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {formatTimestamp(r.submittedAt)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => setShowDetailModal(r)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                            title="Inspect Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Manual actions: strict outlier-only (flagged reports) */}
                          {r.status === 'flagged' && (
                            <button
                              onClick={() => handleReportAction(r.id, 'approve')}
                              disabled={actionLoadingId === r.id}
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 transition-colors disabled:opacity-50"
                              title="Verify Flagged Outlier"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {r.status === 'flagged' && (
                            <button
                              onClick={() => handleReportAction(r.id, 'reject')}
                              disabled={actionLoadingId === r.id}
                              className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors disabled:opacity-50"
                              title="Reject Flagged Outlier"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between p-3.5 border-t border-slate-200 bg-slate-50/50">
          <p className="text-xs text-slate-500 font-medium">
            Showing {filteredReports.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, filteredReports.length)} of {filteredReports.length} reports
          </p>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-600 font-semibold px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Real Report Detail Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-fade-in duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Report #{showDetailModal.id}
                </h2>
                <p className="text-xs text-slate-500">Citizen Observation Inspection</p>
              </div>
              <button
                onClick={() => setShowDetailModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Severity</span>
                  <div className="mt-1 font-bold text-red-600 text-sm">
                    Level {showDetailModal.severity} / 5
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Status</span>
                  <div className="mt-1">
                    <StatusBadge status={showDetailModal.status} size="sm" />
                  </div>
                </div>
              </div>

              {/* Photo Evidence if uploaded */}
              {showDetailModal.imageUrl && (
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Uploaded Evidence Photo</span>
                  </p>
                  <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 h-48 flex items-center justify-center">
                    <img
                      src={showDetailModal.imageUrl}
                      alt="Heat evidence"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="space-y-2">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Location:</span>
                  <span className="font-semibold text-slate-800">{showDetailModal.area}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Submitted By:</span>
                  <span className="text-slate-700 font-medium">
                    {showDetailModal.userName} {showDetailModal.userEmail ? `(${showDetailModal.userEmail})` : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Submitted At:</span>
                  <span className="text-slate-700">{formatTimestamp(showDetailModal.submittedAt)}</span>
                </div>
                {showDetailModal.latitude && showDetailModal.longitude && (
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100 font-mono text-[11px]">
                    <span className="text-slate-500">Coordinates:</span>
                    <span className="text-slate-700">
                      {Number(showDetailModal.latitude).toFixed(4)}, {Number(showDetailModal.longitude).toFixed(4)}
                    </span>
                  </div>
                )}
              </div>

              {/* Description */}
              {showDetailModal.description && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Observer Notes
                  </p>
                  <p className="text-slate-700 leading-relaxed text-xs">
                    {showDetailModal.description}
                  </p>
                </div>
              )}

              {/* Likely Causes */}
              {Array.isArray(showDetailModal.causes) && showDetailModal.causes.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5" />
                    <span>Identified Heat Factors</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {showDetailModal.causes.map((c, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[11px]">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Moderation Controls: strict outlier-only (flagged reports) */}
              {showDetailModal.status === 'flagged' && (
                <div className="pt-3 border-t border-slate-100 flex items-center gap-3">
                  <button
                    onClick={() => {
                      handleReportAction(showDetailModal.id, 'approve');
                    }}
                    disabled={actionLoadingId === showDetailModal.id}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Validate & Approve Outlier</span>
                  </button>
                  <button
                    onClick={() => {
                      handleReportAction(showDetailModal.id, 'reject');
                    }}
                    disabled={actionLoadingId === showDetailModal.id}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject Outlier</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReportManagement;
