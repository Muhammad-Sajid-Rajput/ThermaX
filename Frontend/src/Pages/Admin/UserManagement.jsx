import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminPanel, StatusBadge } from '../../components/admin';
import { toast } from 'react-hot-toast';
import {
  Users,
  Search,
  Filter,
  Shield,
  UserCheck,
  UserX,
  Eye,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Mail,
  Calendar,
  FileText,
  Star,
  Ban,
  CheckCircle,
  XCircle,
  UserCog,
} from 'lucide-react';
import {
  fetchUsers,
  updateUserStatus,
  updateUserRole,
} from '../../services/api';
function UserManagement() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDetailModal, setShowDetailModal] = useState(null);
  // Filters
  const [filters, setFilters] = useState({
    role: 'all',
    status: 'all',
    search: '',
  });
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  useEffect(() => {
    loadUsers();
  }, [filters.role, filters.status]);
  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchUsers();
      const normalized = (data || []).map((u) => ({
        ...u,
        status: u.isActive ? 'active' : 'suspended',
        reportsSubmitted: u.reportsSubmitted || 0,
        reputation: u.reputation || 0,
        lastActive: u.lastActive || u.createdAt,
        joinDate: u.createdAt,
      }));
      setUsers(normalized);
      applyFilters(normalized);
    } catch (err) {
      toast.error('Failed to load users');
      setUsers(mockUsers);
      applyFilters(mockUsers);
    } finally {
      setLoading(false);
    }
  };
  const mockUsers = [
    {
      id: 1,
      name: 'Ahmed Khan',
      email: 'ahmed@email.com',
      role: 'USER',
      status: 'active',
      reportsSubmitted: 12,
      reputation: 4.5,
      lastActive: new Date().toISOString(),
      joinDate: '2025-01-15',
    },
    {
      id: 2,
      name: 'Fatima Ali',
      email: 'fatima@email.com',
      role: 'USER',
      status: 'active',
      reportsSubmitted: 8,
      reputation: 4.2,
      lastActive: new Date(Date.now() - 86400000).toISOString(),
      joinDate: '2025-02-20',
    },
    {
      id: 3,
      name: 'Omar Hassan',
      email: 'omar@email.com',
      role: 'USER',
      status: 'suspended',
      reportsSubmitted: 3,
      reputation: 2.1,
      lastActive: new Date(Date.now() - 604800000).toISOString(),
      joinDate: '2025-03-10',
    },
    {
      id: 4,
      name: 'Zara Ahmed',
      email: 'zara@email.com',
      role: 'ADMIN',
      status: 'active',
      reportsSubmitted: 25,
      reputation: 4.8,
      lastActive: new Date().toISOString(),
      joinDate: '2024-12-01',
    },
    {
      id: 5,
      name: 'Bilal Raza',
      email: 'bilal@email.com',
      role: 'USER',
      status: 'active',
      reportsSubmitted: 6,
      reputation: 3.8,
      lastActive: new Date(Date.now() - 172800000).toISOString(),
      joinDate: '2025-04-05',
    },
    {
      id: 6,
      name: 'Sana Malik',
      email: 'sana@email.com',
      role: 'USER',
      status: 'active',
      reportsSubmitted: 15,
      reputation: 4.6,
      lastActive: new Date(Date.now() - 3600000).toISOString(),
      joinDate: '2025-01-28',
    },
    {
      id: 7,
      name: 'Hassan Ali',
      email: 'hassan@email.com',
      role: 'USER',
      status: 'inactive',
      reportsSubmitted: 2,
      reputation: 3.0,
      lastActive: new Date(Date.now() - 2592000000).toISOString(),
      joinDate: '2025-05-12',
    },
    {
      id: 8,
      name: 'Ayesha Khan',
      email: 'ayesha@email.com',
      role: 'USER',
      status: 'active',
      reportsSubmitted: 19,
      reputation: 4.4,
      lastActive: new Date(Date.now() - 86400000).toISOString(),
      joinDate: '2025-02-14',
    },
  ];
  const applyFilters = (data) => {
    let filtered = data;
    if (filters.role !== 'all') {
      filtered = filtered.filter((u) => u.role === filters.role);
    }
    if (filters.status !== 'all') {
      filtered = filtered.filter((u) => u.status === filters.status);
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.name?.toLowerCase().includes(searchLower) ||
          u.email?.toLowerCase().includes(searchLower)
      );
    }
    setFilteredUsers(filtered);
    setCurrentPage(1);
  };
  useEffect(() => {
    applyFilters(users);
  }, [filters.search]);
  const handleUserAction = async (userId, action) => {
    try {
      const user = users.find((u) => u.id === userId || u._id === userId);
      if (action === 'suspend' || action === 'activate') {
        await updateUserStatus(userId, action === 'activate');
        toast.success(
          `User ${action === 'activate' ? 'activated' : 'suspended'} successfully`
        );
      } else if (action === 'makeAdmin') {
        await updateUserRole(userId, 'ADMIN');
        toast.success('User promoted to admin');
      }
      loadUsers();
    } catch (err) {
      toast.error('Action failed. Please try again.');
    }
  };
  const handleBulkAction = async (action) => {
    if (selectedUsers.length === 0) return;
    try {
      await Promise.all(
        selectedUsers.map((id) => updateUserStatus(id, action === 'activate'))
      );
      toast.success(
        `${selectedUsers.length} users ${action === 'activate' ? 'activated' : 'suspended'}`
      );
      setSelectedUsers([]);
      loadUsers();
    } catch (err) {
      toast.error('Bulk action failed');
    }
  };
  const toggleUserSelection = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };
  const toggleAllSelection = () => {
    if (selectedUsers.length === currentPageItems.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(currentPageItems.map((u) => u.id || u._id));
    }
  };
  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const currentPageItems = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const stats = {
    total: users.length,
    active: users.filter((u) => u.status === 'active').length,
    suspended: users.filter((u) => u.status === 'suspended').length,
    flagged: users.filter((u) => u.reputation < 3).length,
  };
  const getRoleBadge = (role) => {
    if (role === 'ADMIN') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
          <Shield className="w-3 h-3" />
          Admin
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
        <UserCheck className="w-3 h-3" />
        User
      </span>
    );
  };
  const getLastActiveText = (lastActive) => {
    const now = new Date();
    const last = new Date(lastActive);
    const diff = now - last;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  };
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500">
            User control panel and administration
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadUsers}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          <p className="text-xs text-slate-500 uppercase tracking-wider">
            Total Users
          </p>
        </div>
        <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20">
          <p className="text-2xl font-bold text-emerald-400">{stats.active}</p>
          <p className="text-xs text-emerald-500/70 uppercase tracking-wider">
            Active
          </p>
        </div>
        <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/20">
          <p className="text-2xl font-bold text-red-400">{stats.suspended}</p>
          <p className="text-xs text-red-500/70 uppercase tracking-wider">
            Suspended
          </p>
        </div>
        <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/20">
          <p className="text-2xl font-bold text-amber-400">{stats.flagged}</p>
          <p className="text-xs text-amber-500/70 uppercase tracking-wider">
            Flagged
          </p>
        </div>
      </div>
      {/* Filters & Bulk Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search users..."
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
              className="pl-10 pr-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-green-600 transition-colors w-64"
            />
          </div>
          {/* Role Filter */}
          <select
            value={filters.role}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, role: e.target.value }))
            }
            className="px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-green-600 transition-colors"
          >
            <option value="all">All Roles</option>
            <option value="USER">User</option>
            <option value="ADMIN">Admin</option>
          </select>
          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, status: e.target.value }))
            }
            className="px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-green-600 transition-colors"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        {/* Bulk Actions */}
        {selectedUsers.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">
              {selectedUsers.length} selected
            </span>
            <button
              onClick={() => handleBulkAction('activate')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
            >
              <UserCheck className="w-4 h-4" />
              Activate
            </button>
            <button
              onClick={() => handleBulkAction('suspend')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
            >
              <UserX className="w-4 h-4" />
              Suspend
            </button>
          </div>
        )}
      </div>
      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="py-4 px-4 text-left">
                  <input
                    type="checkbox"
                    checked={
                      selectedUsers.length === currentPageItems.length &&
                      currentPageItems.length > 0
                    }
                    onChange={toggleAllSelection}
                    className="rounded border-slate-300 bg-white text-green-600 focus:ring-green-600"
                  />
                </th>
                <th className="py-4 px-4 text-left text-sm font-semibold text-slate-500">
                  User
                </th>
                <th className="py-4 px-4 text-left text-sm font-semibold text-slate-500">
                  Role
                </th>
                <th className="py-4 px-4 text-left text-sm font-semibold text-slate-500">
                  Status
                </th>
                <th className="py-4 px-4 text-left text-sm font-semibold text-slate-500">
                  Reports
                </th>
                <th className="py-4 px-4 text-left text-sm font-semibold text-slate-500">
                  Reputation
                </th>
                <th className="py-4 px-4 text-left text-sm font-semibold text-slate-500">
                  Last Active
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
                    <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-bold text-lg">
                      No users found
                    </p>
                    <p className="text-sm text-slate-400 font-medium">
                      Try adjusting your filters
                    </p>
                  </td>
                </tr>
              ) : (
                currentPageItems.map((user) => (
                  <tr
                    key={user.id || user._id}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id || user._id)}
                        onChange={() =>
                          toggleUserSelection(user.id || user._id)
                        }
                        className="rounded border-slate-300 bg-white text-green-600 focus:ring-green-600"
                      />
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-linear-to-br from-green-600 to-green-700 flex items-center justify-center shadow-sm">
                          <span className="text-white font-semibold">
                            {user.name
                              ?.split('')
                              .map((n) => n[0])
                              .join('') || 'U'}
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">
                            {user.name}
                          </p>
                          <p className="text-sm text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">{getRoleBadge(user.role)}</td>
                    <td className="py-4 px-4">
                      <StatusBadge
                        status={user.status}
                        size="sm"
                        pulse={user.status === 'active'}
                      />
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-700 font-bold">
                          {user.reportsSubmitted}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1">
                        <Star
                          className={`w-4 h-4 ${user.reputation >= 4 ? 'text-yellow-400' : user.reputation >= 3 ? 'text-gray-400' : 'text-red-400'}`}
                        />
                        <span className="text-slate-900 font-bold">
                          {user.reputation.toFixed(1)}
                        </span>
                        <span className="text-gray-500 text-xs">/5.0</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-slate-500 font-medium">
                        {getLastActiveText(user.lastActive)}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setShowDetailModal(user)}
                          className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
                          title="View Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {user.status === 'active' ? (
                          <button
                            onClick={() =>
                              handleUserAction(user.id || user._id, 'suspend')
                            }
                            className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                            title="Suspend User"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              handleUserAction(user.id || user._id, 'activate')
                            }
                            className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                            title="Activate User"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
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
          <p className="text-sm text-slate-500 font-medium">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of{' '}
            {filteredUsers.length} users
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-slate-500 font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      {/* Detail Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-linear-to-br from-green-600 to-green-700 flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-lg">
                    {showDetailModal.name
                      ?.split('')
                      .map((n) => n[0])
                      .join('')}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {showDetailModal.name}
                  </h2>
                  <p className="text-slate-500">{showDetailModal.email}</p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(null)}
                className="p-2 rounded-lg bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Status & Role */}
              <div className="flex items-center gap-4">
                <StatusBadge
                  status={showDetailModal.status}
                  pulse={showDetailModal.status === 'active'}
                />
                {getRoleBadge(showDetailModal.role)}
              </div>
              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
                  <FileText className="w-5 h-5 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-slate-900">
                    {showDetailModal.reportsSubmitted}
                  </p>
                  <p className="text-xs text-slate-500">Reports</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
                  <Star className="w-5 h-5 text-yellow-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-slate-900">
                    {showDetailModal.reputation.toFixed(1)}
                  </p>
                  <p className="text-xs text-slate-500">Reputation</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
                  <Calendar className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-900">
                    {new Date(showDetailModal.joinDate).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-slate-500">Joined</p>
                </div>
              </div>
              {/* Info */}
              <div className="space-y-3">
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-slate-500 font-medium">
                    <Mail className="w-4 h-4" />
                    <span>Email</span>
                  </div>
                  <span className="text-slate-900 font-semibold">
                    {showDetailModal.email}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-slate-500 font-medium">
                    <UserCog className="w-4 h-4" />
                    <span>Role</span>
                  </div>
                  <span className="text-slate-900 font-semibold">
                    {showDetailModal.role}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-slate-500 font-medium">
                    <Shield className="w-4 h-4" />
                    <span>Status</span>
                  </div>
                  <span className="text-slate-900 font-semibold capitalize">
                    {showDetailModal.status}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2 text-slate-500 font-medium">
                    <Calendar className="w-4 h-4" />
                    <span>Last Active</span>
                  </div>
                  <span className="text-slate-900 font-semibold">
                    {getLastActiveText(showDetailModal.lastActive)}
                  </span>
                </div>
              </div>
              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                {showDetailModal.role !== 'ADMIN' && (
                  <button
                    onClick={() => {
                      handleUserAction(
                        showDetailModal.id || showDetailModal._id,
                        'makeAdmin'
                      );
                      setShowDetailModal(null);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-purple-500 text-white font-medium hover:bg-purple-600 transition-colors"
                  >
                    <Shield className="w-5 h-5" />
                    Make Admin
                  </button>
                )}
                {showDetailModal.status === 'active' ? (
                  <button
                    onClick={() => {
                      handleUserAction(
                        showDetailModal.id || showDetailModal._id,
                        'suspend'
                      );
                      setShowDetailModal(null);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
                  >
                    <Ban className="w-5 h-5" />
                    Suspend User
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      handleUserAction(
                        showDetailModal.id || showDetailModal._id,
                        'activate'
                      );
                      setShowDetailModal(null);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors shadow-sm"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Activate User
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
