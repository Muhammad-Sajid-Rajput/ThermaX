import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  FileText,
  Users,
  Map,
  BarChart3,
  Shield,
  LogOut,
  Flame,
  ChevronRight,
  ArrowLeft,
  Globe,
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
      description: 'User Directory',
    },
    {
      path: '/admin/heatmap',
      icon: Map,
      label: 'Heatmap & Hotspots',
      description: 'Spatial Heat Layers',
    },
    {
      path: '/admin/analytics',
      icon: BarChart3,
      label: 'Analytics',
      description: 'System Insights',
    },
  ];

  const isActivePath = (path) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-full shadow-sm select-none">
      {/* Logo Section */}
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-green-500 to-green-700 flex items-center justify-center shadow-md shadow-green-600/20">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight leading-tight">
              ThermaX
            </h1>
            <p className="text-xs font-semibold text-emerald-600">Admin Control</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-4">
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
            Operations
          </p>
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActivePath(item.path);
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group ${
                    isActive
                      ? 'bg-emerald-50/80 text-emerald-950 font-semibold border-l-3 border-emerald-600'
                      : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900 border-l-3 border-transparent'
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-500 group-hover:text-slate-700 group-hover:bg-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{item.label}</p>
                    <p className="text-[11px] text-slate-400 font-normal truncate">
                      {item.description}
                    </p>
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4 text-emerald-600 shrink-0" />}
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* Public App Navigation */}
        <div className="pt-2 border-t border-slate-100">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
            Public Application
          </p>
          <NavLink
            to="/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/60 transition-all duration-150 group"
          >
            <div className="p-2 rounded-lg bg-slate-100 text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-700 transition-colors">
              <Globe className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Public Dashboard</p>
              <p className="text-[11px] text-slate-400 truncate">Exit admin console</p>
            </div>
            <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 rotate-180 shrink-0 transition-transform group-hover:translate-x-0.5" />
          </NavLink>
        </div>
      </nav>

      {/* User & Logout Section */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/60">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-linear-to-br from-emerald-600 to-green-700 flex items-center justify-center text-white shadow-xs font-bold text-sm">
            {user?.name?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">
              {user?.name || 'Administrator'}
            </p>
            <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">
              {user?.role || 'ADMIN'}
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-colors text-xs font-semibold shadow-2xs cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
