import { useState, useEffect, useCallback } from 'react';
import { AdminPanel, StatusBadge } from '../../components/admin';
import { toast } from 'react-hot-toast';
import {
  Users,
  Search,
  Shield,
  UserCheck,
  UserX,
  Eye,
  RefreshCw,
  Mail,
  Calendar,
  FileText,
  Ban,
  CheckCircle,
  XCircle,
  UserCog,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import {
  fetchUsers,
  updateUserStatus,
  updateUserRole,
  formatTimestamp,
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';

function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDetailModal, setShowDetailModal] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    role: 'all',
    status: 'all',
    search: '',
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchUsers();
      const normalized = (data || []).map((u) => ({
        ...u,
        id: u._id || u.id,
        name: u.fullName || u.name || 'ThermaX User',
        role: (u.role || 'USER').toUpperCase(),
        status: u.isActive === false ? 'suspended' : 'active',
        joinDate: u.createdAt,
        lastActive: u.updatedAt || u.createdAt,
      }));
      setUsers(normalized);
      // Client-side filters are applied by the effect below which watches
      // `users` — calling applyFilters here directly would capture a stale
      // closure over `filters` (exhaustive-deps).
    } catch (err) {
      console.error('Failed to load users:', err);
      toast.error('Failed to fetch real user directory.');
      setUsers([]);
      setFilteredUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const applyFilters = useCallback(
    (data = users) => {
      let result = [...data];

      if (filters.role !== 'all') {
        result = result.filter(
          (u) => (u.role || '').toUpperCase() === filters.role.toUpperCase()
        );
      }

      if (filters.status !== 'all') {
        result = result.filter((u) => u.status === filters.status);
      }

      if (filters.search.trim()) {
        const query = filters.search.toLowerCase().trim();
        result = result.filter(
          (u) =>
            u.name?.toLowerCase().includes(query) ||
            u.email?.toLowerCase().includes(query) ||
            u.id?.toLowerCase().includes(query)
        );
      }

      setFilteredUsers(result);
      setCurrentPage(1);
    },
    [users, filters]
  );

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    applyFilters(users);
  }, [filters, applyFilters, users]);

  // Actions
  const isCurrentAdmin = (id) => {
    return Boolean(
      currentUser &&
      (id === currentUser._id || id === currentUser.id || id === currentUser.userId)
    );
  };

  const handleUserStatusToggle = async (userId, targetActive) => {
    if (!targetActive && isCurrentAdmin(userId)) {
      toast.error('You cannot suspend your own administrative account.');
      return;
    }

    const actionWord = targetActive ? 'activate' : 'suspend';
    if (!window.confirm(`Are you sure you want to ${actionWord} this account?`)) {
      return;
    }

    try {
      setActionInProgress(true);
      await updateUserStatus(userId, targetActive);
      toast.success(
        `User ${targetActive ? 'activated' : 'suspended'} successfully.`
      );
      await loadUsers();
      if (showDetailModal && (showDetailModal.id === userId || showDetailModal._id === userId)) {
        setShowDetailModal((prev) => ({
          ...prev,
          status: targetActive ? 'active' : 'suspended',
          isActive: targetActive,
        }));
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update user status.');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleUserRoleChange = async (userId, targetRole) => {
    if (targetRole !== 'ADMIN' && isCurrentAdmin(userId)) {
      toast.error('You cannot demote your own administrative account.');
      return;
    }

    if (!window.confirm(`Are you sure you want to change this user's role to ${targetRole}?`)) {
      return;
    }

    try {
      setActionInProgress(true);
      await updateUserRole(userId, targetRole);
      toast.success(`User role changed to ${targetRole}.`);
      await loadUsers();
      if (showDetailModal && (showDetailModal.id === userId || showDetailModal._id === userId)) {
        setShowDetailModal((prev) => ({
          ...prev,
          role: targetRole,
        }));
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to change user role.');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleBulkAction = async (targetActive) => {
    if (selectedUsers.length === 0) return;

    if (!targetActive && selectedUsers.some(isCurrentAdmin)) {
      toast.error('Your own account is selected. Remove yourself before bulk suspension.');
      return;
    }

    const actionWord = targetActive ? 'activate' : 'suspend';
    if (!window.confirm(`Are you sure you want to ${actionWord} ${selectedUsers.length} selected user(s)?`)) {
      return;
    }

    try {
      setActionInProgress(true);
      await Promise.all(
        selectedUsers.map((id) => updateUserStatus(id, targetActive))
      );
      toast.success(
        `${selectedUsers.length} user(s) ${targetActive ? 'activated' : 'suspended'}.`
      );
      setSelectedUsers([]);
      await loadUsers();
    } catch {
      toast.error('Bulk update failed.');
    } finally {
      setActionInProgress(false);
    }
  };

  const toggleUserSelection = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleAllSelection = () => {
    if (selectedUsers.length === currentPageItems.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(currentPageItems.map((u) => u.id));
    }
  };

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
  const currentPageItems = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const stats = {
    total: users.length,
    active: users.filter((u) => u.status === 'active').length,
    suspended: users.filter((u) => u.status === 'suspended').length,
    admins: users.filter((u) => u.role === 'ADMIN').length,
  };

  const getRoleBadge = (role) => {
    if (role === 'ADMIN') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200">
          <Shield className="w-3 h-3 text-purple-600" />
          Admin
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
        <UserCheck className="w-3 h-3 text-slate-500" />
        User
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-6 h-6 text-emerald-600" />
            <h1 className="text-xl font-bold text-slate-900">User Management</h1>
          </div>
          <p className="text-xs text-slate-500">
            Real MongoDB accounts, access roles, and suspension governance
          </p>
        </div>

        <button
          onClick={loadUsers}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors text-xs font-semibold shadow-xs disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          <span>Refresh Users</span>
        </button>
      </div>

      {/* Real Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
            Total Users
          </p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 shadow-xs">
          <p className="text-2xl font-bold text-emerald-700">{stats.active}</p>
          <p className="text-[11px] text-emerald-700 font-semibold uppercase tracking-wider mt-0.5">
            Active Accounts
          </p>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 border border-purple-100 shadow-xs">
          <p className="text-2xl font-bold text-purple-700">{stats.admins}</p>
          <p className="text-[11px] text-purple-700 font-semibold uppercase tracking-wider mt-0.5">
            Administrators
          </p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 border border-red-100 shadow-xs">
          <p className="text-2xl font-bold text-red-700">{stats.suspended}</p>
          <p className="text-[11px] text-red-700 font-semibold uppercase tracking-wider mt-0.5">
            Suspended
          </p>
        </div>
      </div>

      {/* Filters & Bulk Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
              className="pl-9 pr-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 transition-colors w-64"
            />
          </div>

          {/* Role Filter */}
          <select
            value={filters.role}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, role: e.target.value }))
            }
            className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium focus:outline-none focus:border-emerald-600"
          >
            <option value="all">All Roles</option>
            <option value="USER">Citizens (USER)</option>
            <option value="ADMIN">Admins (ADMIN)</option>
          </select>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, status: e.target.value }))
            }
            className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium focus:outline-none focus:border-emerald-600"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended Only</option>
          </select>
        </div>

        {/* Bulk Actions */}
        {selectedUsers.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">
              {selectedUsers.length} selected
            </span>
            <button
              onClick={() => handleBulkAction(true)}
              disabled={actionInProgress}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-colors disabled:opacity-50"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Activate</span>
            </button>
            <button
              onClick={() => handleBulkAction(false)}
              disabled={actionInProgress}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 text-xs font-semibold hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              <UserX className="w-3.5 h-3.5" />
              <span>Suspend</span>
            </button>
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={
                      selectedUsers.length === currentPageItems.length &&
                      currentPageItems.length > 0
                    }
                    onChange={toggleAllSelection}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
                  />
                </th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Joined Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="py-4 px-4">
                      <div className="h-6 bg-slate-100 rounded"></div>
                    </td>
                  </tr>
                ))
              ) : currentPageItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600 text-sm">No users found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Try resetting your search or role filters.
                    </p>
                  </td>
                </tr>
              ) : (
                currentPageItems.map((u) => {
                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="py-3.5 px-4">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(u.id)}
                          onChange={() => toggleUserSelection(u.id)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
                        />
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                            {u.name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">
                              {u.name}
                            </p>
                            <p className="text-slate-500 font-mono text-[11px] truncate">
                              {u.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">{getRoleBadge(u.role)}</td>

                      <td className="py-3.5 px-4">
                        <StatusBadge
                          status={u.status}
                          size="sm"
                          pulse={u.status === 'active'}
                        />
                      </td>

                      <td className="py-3.5 px-4 text-slate-500">
                        {formatTimestamp(u.joinDate)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => setShowDetailModal(u)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                            title="View Account Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {u.status === 'active' ? (
                            <button
                              onClick={() => handleUserStatusToggle(u.id, false)}
                              disabled={actionInProgress}
                              className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors disabled:opacity-50"
                              title="Suspend User"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUserStatusToggle(u.id, true)}
                              disabled={actionInProgress}
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 transition-colors disabled:opacity-50"
                              title="Activate User"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
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
            Showing {filteredUsers.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} users
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

      {/* User Details & Governance Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-fade-in duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                  {showDetailModal.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    {showDetailModal.name}
                  </h2>
                  <p className="text-xs text-slate-500 font-mono">
                    {showDetailModal.email}
                  </p>
                </div>
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
                  <p className="text-[11px] text-slate-400 font-semibold uppercase">Role</p>
                  <div className="mt-1">{getRoleBadge(showDetailModal.role)}</div>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-slate-400 font-semibold uppercase">Status</p>
                  <div className="mt-1">
                    <StatusBadge
                      status={showDetailModal.status}
                      size="sm"
                      pulse={showDetailModal.status === 'active'}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Database ID:</span>
                  <span className="font-mono text-slate-700">{showDetailModal.id}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Registered:</span>
                  <span className="text-slate-700">{formatTimestamp(showDetailModal.joinDate)}</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-slate-500">Account Health:</span>
                  <span className="text-emerald-700 font-semibold">Active & Validated</span>
                </div>
              </div>

              {/* Governance Actions */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Governance Controls
                </p>

                {showDetailModal.role === 'ADMIN' ? (
                  <button
                    onClick={() => handleUserRoleChange(showDetailModal.id, 'USER')}
                    disabled={actionInProgress}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 font-semibold hover:bg-amber-100 transition-colors disabled:opacity-50"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                    <span>Demote to Citizen User</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleUserRoleChange(showDetailModal.id, 'ADMIN')}
                    disabled={actionInProgress}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 font-semibold hover:bg-purple-100 transition-colors disabled:opacity-50"
                  >
                    <Shield className="w-3.5 h-3.5 text-purple-600" />
                    <span>Promote to Administrator</span>
                  </button>
                )}

                {showDetailModal.status === 'active' ? (
                  <button
                    onClick={() => handleUserStatusToggle(showDetailModal.id, false)}
                    disabled={actionInProgress}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 text-red-700 border border-red-200 font-semibold hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Suspend Account</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleUserStatusToggle(showDetailModal.id, true)}
                    disabled={actionInProgress}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-50"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Re-activate Account</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;
