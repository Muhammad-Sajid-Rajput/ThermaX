import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminPanel, StatusBadge } from '../../components/admin';
import { toast } from 'react-hot-toast';
import {
  FileText,
  CheckCircle,
  XCircle,
  Eye,
  Filter,
  Search,
  Download,
  Trash2,
  AlertTriangle,
  Clock,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { fetchReports, updateModerationStatus } from '../../services/api';
function ReportManagement() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [selectedReports, setSelectedReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDetailModal, setShowDetailModal] = useState(null);
  // Filters
  const [filters, setFilters] = useState({
    status: 'all',
    severity: 'all',
    area: 'all',
    search: '',
  });
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  useEffect(() => {
    loadReports();
  }, [filters.status, filters.severity, filters.area]);
  const loadReports = async () => {
    setLoading(true);
    try {
      const response = await fetchReports({
        status: filters.status === 'all' ? undefined : filters.status,
        severity:
          filters.severity === 'all' ? undefined : parseInt(filters.severity),
        area: filters.area === 'all' ? undefined : filters.area,
      });
      const data = response?.data || [];
      setReports(data);
      applyFilters(data);
    } catch (err) {
      toast.error('Failed to load reports');
      // Fallback data
      setReports(mockReports);
      applyFilters(mockReports);
    } finally {
      setLoading(false);
    }
  };
  const mockReports = [
    {
      id: 'RPT-2026-1552',
      area: 'Korangi',
      severity: 5,
      status: 'pending',
      user: { name: 'Ahmed Khan', email: 'ahmed@email.com' },
      timestamp: new Date().toISOString(),
      description: 'Extreme heat reported in industrial area',
      location: { lat: 24.8508, lng: 67.0529 },
    },
    {
      id: 'RPT-2026-1551',
      area: 'Saddar',
      severity: 4,
      status: 'pending',
      user: { name: 'Fatima Ali', email: 'fatima@email.com' },
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      description: 'High temperature in commercial district',
      location: { lat: 24.8615, lng: 67.0099 },
    },
    {
      id: 'RPT-2026-1550',
      area: 'Gulshan',
      severity: 3,
      status: 'validated',
      user: { name: 'Omar Hassan', email: 'omar@email.com' },
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      description: 'Moderate heat issue in residential area',
      location: { lat: 24.918, lng: 67.0971 },
    },
    {
      id: 'RPT-2026-1549',
      area: 'DHA',
      severity: 4,
      status: 'pending',
      user: { name: 'Zara Ahmed', email: 'zara@email.com' },
      timestamp: new Date(Date.now() - 10800000).toISOString(),
      description: 'Heat stress reported near park area',
      location: { lat: 24.8238, lng: 67.0676 },
    },
    {
      id: 'RPT-2026-1548',
      area: 'Landhi',
      severity: 5,
      status: 'rejected',
      user: { name: 'Bilal Raza', email: 'bilal@email.com' },
      timestamp: new Date(Date.now() - 14400000).toISOString(),
      description: 'Critical heat zone identified',
      location: { lat: 24.8402, lng: 67.1856 },
    },
    {
      id: 'RPT-2026-1547',
      area: 'Korangi',
      severity: 3,
      status: 'validated',
      user: { name: 'Sana Malik', email: 'sana@email.com' },
      timestamp: new Date(Date.now() - 18000000).toISOString(),
      description: 'Heat index elevated',
      location: { lat: 24.8508, lng: 67.0529 },
    },
    {
      id: 'RPT-2026-1546',
      area: 'Saddar',
      severity: 2,
      status: 'validated',
      user: { name: 'Hassan Ali', email: 'hassan@email.com' },
      timestamp: new Date(Date.now() - 21600000).toISOString(),
      description: 'Minor heat discomfort reported',
      location: { lat: 24.8615, lng: 67.0099 },
    },
    {
      id: 'RPT-2026-1545',
      area: 'Gulshan',
      severity: 4,
      status: 'pending',
      user: { name: 'Ayesha Khan', email: 'ayesha@email.com' },
      timestamp: new Date(Date.now() - 25200000).toISOString(),
      description: 'Severe heat in market area',
      location: { lat: 24.918, lng: 67.0971 },
    },
  ];
  const applyFilters = (data) => {
    let filtered = data;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.id?.toLowerCase().includes(searchLower) ||
          r.area?.toLowerCase().includes(searchLower) ||
          r.user?.name?.toLowerCase().includes(searchLower)
      );
    }
    setFilteredReports(filtered);
    setCurrentPage(1);
  };
  useEffect(() => {
    applyFilters(reports);
  }, [filters.search]);
  const handleReportAction = async (reportId, action) => {
    try {
      if (action === 'approve') {
        await updateModerationStatus(reportId, 'validated');
        toast.success('Report approved successfully');
      } else if (action === 'reject') {
        await updateModerationStatus(reportId, 'rejected');
        toast.success('Report rejected');
      }
      loadReports();
    } catch (err) {
      toast.error('Action failed. Please try again.');
    }
  };
  const handleBulkAction = async (action) => {
    if (selectedReports.length === 0) return;
    try {
      await Promise.all(
        selectedReports.map((id) =>
          updateModerationStatus(
            id,
            action === 'approve' ? 'validated' : 'rejected'
          )
        )
      );
      toast.success(
        `${selectedReports.length} reports ${action === 'approve' ? 'approved' : 'rejected'}`
      );
      setSelectedReports([]);
      loadReports();
    } catch (err) {
      toast.error('Bulk action failed');
    }
  };
  const toggleReportSelection = (reportId) => {
    setSelectedReports((prev) =>
      prev.includes(reportId)
        ? prev.filter((id) => id !== reportId)
        : [...prev, reportId]
    );
  };
  const toggleAllSelection = () => {
    if (selectedReports.length === currentPageItems.length) {
      setSelectedReports([]);
    } else {
      setSelectedReports(currentPageItems.map((r) => r.id || r._id));
    }
  };
  // Pagination
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const currentPageItems = filteredReports.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const stats = {
    total: reports.length,
    pending: reports.filter(
      (r) => r.status === 'pending' || r.status === 'Pending'
    ).length,
    validated: reports.filter(
      (r) => r.status === 'validated' || r.status === 'Validated'
    ).length,
    rejected: reports.filter(
      (r) => r.status === 'rejected' || r.status === 'Rejected'
    ).length,
  };
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Report Management
          </h1>
          <p className="text-slate-500">
            Moderation interface for heat reports
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadReports}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
            Total Reports
          </p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 shadow-sm">
          <p className="text-2xl font-bold text-emerald-600">
            {stats.validated}
          </p>
          <p className="text-xs text-emerald-600/70 font-bold uppercase tracking-wider">
            Validated
          </p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 shadow-sm">
          <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
          <p className="text-xs text-amber-600/70 font-bold uppercase tracking-wider">
            Pending
          </p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 border border-red-100 shadow-sm">
          <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
          <p className="text-xs text-red-600/70 font-bold uppercase tracking-wider">
            Rejected
          </p>
        </div>
      </div>
      {/* Filters & Bulk Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search reports..."
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
              className="pl-10 pr-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-green-600 transition-colors w-64"
            />
          </div>
          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, status: e.target.value }))
            }
            className="px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-green-600 transition-colors"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="validated">Validated</option>
            <option value="rejected">Rejected</option>
          </select>
          {/* Severity Filter */}
          <select
            value={filters.severity}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, severity: e.target.value }))
            }
            className="px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-green-600 transition-colors"
          >
            <option value="all">All Severity</option>
            <option value="5">Critical (5)</option>
            <option value="4">High (4)</option>
            <option value="3">Moderate (3)</option>
            <option value="2">Low (2)</option>
            <option value="1">Safe (1)</option>
          </select>
          {/* Area Filter */}
          <select
            value={filters.area}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, area: e.target.value }))
            }
            className="px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-green-600 transition-colors"
          >
            <option value="all">All Areas</option>
            <option value="Korangi">Korangi</option>
            <option value="Saddar">Saddar</option>
            <option value="Gulshan">Gulshan</option>
            <option value="DHA">DHA</option>
            <option value="Landhi">Landhi</option>
          </select>
        </div>
        {/* Bulk Actions */}
        {selectedReports.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">
              {selectedReports.length} selected
            </span>
            <button
              onClick={() => handleBulkAction('approve')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Approve
            </button>
            <button
              onClick={() => handleBulkAction('reject')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors"
            >
              <XCircle className="w-4 h-4" />
              Reject
            </button>
          </div>
        )}
      </div>
      {/* Reports Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="py-4 px-4 text-left">
                  <input
                    type="checkbox"
                    checked={
                      selectedReports.length === currentPageItems.length &&
                      currentPageItems.length > 0
                    }
                    onChange={toggleAllSelection}
                    className="rounded border-slate-300 bg-white text-green-600 focus:ring-green-600"
                  />
                </th>
                <th className="py-4 px-4 text-left text-sm font-semibold text-slate-500">
                  Report ID
                </th>
                <th className="py-4 px-4 text-left text-sm font-semibold text-slate-500">
                  Location
                </th>
                <th className="py-4 px-4 text-left text-sm font-semibold text-slate-500">
                  Severity
                </th>
                <th className="py-4 px-4 text-left text-sm font-semibold text-slate-500">
                  Status
                </th>
                <th className="py-4 px-4 text-left text-sm font-semibold text-slate-500">
                  User
                </th>
                <th className="py-4 px-4 text-left text-sm font-semibold text-slate-500">
                  Submitted
                </th>
                <th className="py-4 px-4 text-left text-sm font-semibold text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td colSpan={8} className="py-4 px-4">
                      <div className="h-12 bg-slate-50 rounded animate-pulse"></div>
                    </td>
                  </tr>
                ))
              ) : currentPageItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-bold text-lg">
                      No reports found
                    </p>
                    <p className="text-sm text-slate-400 font-medium">
                      Try adjusting your filters
                    </p>
                  </td>
                </tr>
              ) : (
                currentPageItems.map((report) => (
                  <tr
                    key={report.id || report._id}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <input
                        type="checkbox"
                        checked={selectedReports.includes(
                          report.id || report._id
                        )}
                        onChange={() =>
                          toggleReportSelection(report.id || report._id)
                        }
                        className="rounded border-slate-300 bg-white text-green-600 focus:ring-green-600"
                      />
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-mono text-sm text-slate-900 font-medium">
                        {report.id || report._id}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-600 font-medium">
                          {report.area}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <StatusBadge
                        status={
                          report.severity >= 5
                            ? 'critical_severity'
                            : report.severity >= 4
                              ? 'high'
                              : report.severity >= 3
                                ? 'moderate'
                                : 'low'
                        }
                        size="sm"
                      />
                    </td>
                    <td className="py-4 px-4">
                      <StatusBadge
                        status={report.status?.toLowerCase() || 'pending'}
                        size="sm"
                      />
                    </td>
                    <td className="py-4 px-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {report.user?.name || 'Unknown'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {report.user?.email}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-slate-500">
                        {new Date(report.timestamp).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            handleReportAction(
                              report.id || report._id,
                              'approve'
                            )
                          }
                          className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
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
                          className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                          title="Reject"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setShowDetailModal(report)}
                          className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50/30">
          <p className="text-sm text-gray-400">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, filteredReports.length)} of{' '}
            {filteredReports.length} reports
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-400">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      {/* Detail Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {showDetailModal.id}
                </h2>
                <p className="text-slate-500">Report Details</p>
              </div>
              <button
                onClick={() => setShowDetailModal(null)}
                className="p-2 rounded-lg bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Status & Severity */}
              <div className="flex items-center gap-4">
                <StatusBadge status={showDetailModal.status?.toLowerCase()} />
                <StatusBadge
                  status={
                    showDetailModal.severity >= 5
                      ? 'critical_severity'
                      : showDetailModal.severity >= 4
                        ? 'high'
                        : showDetailModal.severity >= 3
                          ? 'moderate'
                          : 'low'
                  }
                />
              </div>
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                    Area
                  </p>
                  <p className="text-lg font-semibold text-slate-900">
                    {showDetailModal.area}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                    Submitted
                  </p>
                  <p className="text-lg font-semibold text-slate-900">
                    {new Date(showDetailModal.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
              {/* User Info */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
                  Submitted By
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-linear-to-br from-green-600 to-green-700 flex items-center justify-center shadow-md">
                    <span className="text-white font-semibold">
                      {showDetailModal.user?.name?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">
                      {showDetailModal.user?.name || 'Unknown'}
                    </p>
                    <p className="text-sm text-slate-500">
                      {showDetailModal.user?.email}
                    </p>
                  </div>
                </div>
              </div>
              {/* Description */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
                  Description
                </p>
                <p className="text-slate-700 leading-relaxed">
                  {showDetailModal.description || 'No description provided'}
                </p>
              </div>
              {/* Location */}
              {showDetailModal.location && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
                    Coordinates
                  </p>
                  <p className="text-slate-600 font-mono">
                    {showDetailModal.location.lat?.toFixed(4)},{' '}
                    {showDetailModal.location.lng?.toFixed(4)}
                  </p>
                </div>
              )}
              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <button
                  onClick={() => {
                    handleReportAction(
                      showDetailModal.id || showDetailModal._id,
                      'approve'
                    );
                    setShowDetailModal(null);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors shadow-sm"
                >
                  <CheckCircle className="w-5 h-5" />
                  Approve Report
                </button>
                <button
                  onClick={() => {
                    handleReportAction(
                      showDetailModal.id || showDetailModal._id,
                      'reject'
                    );
                    setShowDetailModal(null);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors shadow-sm"
                >
                  <XCircle className="w-5 h-5" />
                  Reject Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default ReportManagement;
