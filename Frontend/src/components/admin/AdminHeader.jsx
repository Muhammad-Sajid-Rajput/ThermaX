import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Shield,
  Bell,
  Search,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
} from 'lucide-react';
const AdminHeader = () => {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [systemStatus, setSystemStatus] = useState('operational');
  const [notifications, setNotifications] = useState(3);
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const getStatusConfig = () => {
    switch (systemStatus) {
      case 'operational':
        return {
          icon: CheckCircle,
          color: 'text-emerald-400',
          bgColor: 'bg-emerald-500/10',
          borderColor: 'border-emerald-500/20',
          label: 'Operational',
          sublabel: 'All systems normal',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          color: 'text-amber-400',
          bgColor: 'bg-amber-500/10',
          borderColor: 'border-amber-500/20',
          label: 'Warning',
          sublabel: 'Issues detected',
        };
      case 'critical':
        return {
          icon: XCircle,
          color: 'text-red-400',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/20',
          label: 'Critical',
          sublabel: 'System failure',
        };
      default:
        return {
          icon: CheckCircle,
          color: 'text-emerald-400',
          bgColor: 'bg-emerald-500/10',
          borderColor: 'border-emerald-500/20',
          label: 'Operational',
          sublabel: 'All systems normal',
        };
    }
  };
  const status = getStatusConfig();
  const StatusIcon = status.icon;
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 lg:px-8 shrink-0 shadow-sm">
      {/* Left - Page Title could go here */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-slate-500">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-mono">
            {currentTime.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
            })}
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-sm">
            {currentTime.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
      </div>
      {/* Right - System Status & User */}
      <div className="flex items-center gap-4">
        {/* System Status */}
        <div
          className={`flex items-center gap-3 px-4 py-2 rounded-xl border ${status.bgColor} ${status.borderColor}`}
        >
          <div className="relative">
            <StatusIcon className={`w-5 h-5 ${status.color}`} />
            <span
              className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full animate-pulse ${
                systemStatus === 'operational'
                  ? 'bg-emerald-500'
                  : systemStatus === 'warning'
                    ? 'bg-amber-500'
                    : 'bg-red-500'
              }`}
            />
          </div>
          <div className="hidden sm:block">
            <p className={`text-sm font-semibold ${status.color}`}>
              {status.label}
            </p>
            <p className="text-xs text-slate-500">{status.sublabel}</p>
          </div>
        </div>
        {/* Notifications */}
        <button className="relative p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-200 transition-all duration-200">
          <Bell className="w-5 h-5" />
          {notifications > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs font-semibold flex items-center justify-center">
              {notifications}
            </span>
          )}
        </button>
        {/* User Badge */}
        <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-slate-900">
              {user?.name || 'Admin'}
            </p>
            <p className="text-xs text-slate-500">System Controller</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-linear-to-br from-green-600 to-green-700 flex items-center justify-center shadow-lg shadow-green-500/20">
            <Shield className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>
    </header>
  );
};
export default AdminHeader;
