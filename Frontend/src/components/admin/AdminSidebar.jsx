import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  FileText,
  Users,
  Map,
  BarChart3,
  Bell,
  Settings,
  Shield,
  LogOut,
  Flame,
  ChevronRight,
} from 'lucide-react';
const AdminSidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navItems = [
    {
      path: '/admin',
      icon: LayoutDashboard,
      label: 'Dashboard',
      description: 'Command Center',
    },
    {
      path: '/admin/reports',
      icon: FileText,
      label: 'Reports',
      description: 'Moderation Queue',
    },
    {
      path: '/admin/users',
      icon: Users,
      label: 'Users',
      description: 'User Management',
    },
    {
      path: '/admin/heatmap',
      icon: Map,
      label: 'Heatmap Control',
      description: 'Map & Layers',
    },
    {
      path: '/admin/analytics',
      icon: BarChart3,
      label: 'Analytics',
      description: 'Insights & Trends',
    },
    {
      path: '/admin/alerts',
      icon: Bell,
      label: 'Alerts',
      description: 'Alert System',
    },
    {
      path: '/admin/settings',
      icon: Settings,
      label: 'Settings',
      description: 'System Settings',
    },
  ];
  const isActivePath = (path) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };
  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-full shadow-sm">
      {/* Logo Section */}
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-green-500 to-green-700 flex items-center justify-center shadow-lg shadow-green-500/20">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              ThermaX
            </h1>
            <p className="text-xs text-slate-500">Urban Heat Intelligence</p>
          </div>
        </div>
      </div>
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <div className="mb-4 px-3">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Command Center
          </p>
        </div>
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isActivePath(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-linear-to-r from-green-50 to-transparent border-l-2 border-green-600'
                    : 'hover:bg-slate-50 border-l-2 border-transparent'
                }`}
              >
                <div
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-green-100 text-green-700'
                      : 'bg-slate-100 text-slate-500 group-hover:text-slate-700 group-hover:bg-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p
                    className={`text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-slate-900'
                        : 'text-slate-600 group-hover:text-slate-800'
                    }`}
                  >
                    {item.label}
                  </p>
                  <p className="text-xs text-slate-500 font-medium">
                    {item.description}
                  </p>
                </div>
                {isActive && (
                  <ChevronRight className="w-4 h-4 text-green-600" />
                )}
              </NavLink>
            );
          })}
        </div>
        {/* System Info */}
        <div className="mt-6 px-3">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            System Info
          </p>
          <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Version</span>
              <span className="text-slate-700 font-medium">v2.1.0</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Database</span>
              <span className="text-emerald-600 flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Online
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">API Status</span>
              <span className="text-emerald-600 flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Online
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Uptime</span>
              <span className="text-slate-700 font-medium">99.8%</span>
            </div>
          </div>
        </div>
      </nav>
      {/* User Section */}
      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-linear-to-br from-green-600 to-green-700 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">
              {user?.name || 'Admin'}
            </p>
            <p className="text-xs text-slate-500">System Controller</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-all duration-200 text-sm font-medium group border border-red-100"
        >
          <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          Logout
        </button>
      </div>
    </aside>
  );
};
export default AdminSidebar;
