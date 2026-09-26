import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  CheckCircle,
  Clock,
  LayoutDashboard,
  FileText,
  Users,
  Map,
  BarChart3,
} from 'lucide-react';

const PAGE_TITLES = {
  '/admin': { title: 'Command Center', icon: LayoutDashboard },
  '/admin/reports': { title: 'Report Moderation', icon: FileText },
  '/admin/users': { title: 'User Directory', icon: Users },
  '/admin/heatmap': { title: 'Spatial Heatmap & Hotspots', icon: Map },
  '/admin/analytics': { title: 'System Analytics & Trends', icon: BarChart3 },
};

const AdminHeader = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const pageInfo = PAGE_TITLES[location.pathname] || {
    title: 'Admin Control',
    icon: LayoutDashboard,
  };
  const PageIcon = pageInfo.icon;

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 lg:px-8 shrink-0 shadow-2xs select-none">
      {/* Page Title & Breadcrumb */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
          <PageIcon className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-900 leading-tight">
            {pageInfo.title}
          </h2>
          <p className="text-[11px] text-slate-400 font-medium">
            ThermaX Operations
          </p>
        </div>
      </div>

      {/* Right - Live Status & Clock */}
      <div className="flex items-center gap-3">
        {/* System Online Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-800 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>API Connected</span>
        </div>

        {/* Live Clock */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs font-mono font-medium">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>
            {currentTime.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
            })}
          </span>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
