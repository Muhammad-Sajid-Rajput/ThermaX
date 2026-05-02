import { useState } from 'react';
import { AdminPanel, StatusBadge } from '../../components/admin';
import { toast } from 'react-hot-toast';
import {
  Bell,
  Send,
  MapPin,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Target,
  Radio,
  Megaphone,
  Shield,
  Thermometer,
} from 'lucide-react';
function AlertSystem() {
  const [alertForm, setAlertForm] = useState({
    title: '',
    message: '',
    severity: 'warning',
    target: 'all',
    type: 'heat',
  });
  const [recentAlerts, setRecentAlerts] = useState([
    {
      id: 1,
      title: 'Extreme Heat Warning',
      message:
        'Temperatures expected to reach 42°C in Korangi Industrial Area. Stay hydrated and avoid outdoor activities.',
      severity: 'critical',
      target: 'Korangi Industrial Area',
      sentAt: '2026-04-30T10:30:00',
      recipients: 2847,
      status: 'delivered',
    },
    {
      id: 2,
      title: 'Heat Advisory',
      message:
        'High temperatures predicted for Saddar and surrounding areas. Take necessary precautions.',
      severity: 'warning',
      target: 'Saddar',
      sentAt: '2026-04-30T09:15:00',
      recipients: 1523,
      status: 'delivered',
    },
    {
      id: 3,
      title: 'System Maintenance',
      message:
        'Scheduled maintenance will occur tonight at 2 AM. Service interruptions expected for 30 minutes.',
      severity: 'info',
      target: 'All Users',
      sentAt: '2026-04-29T18:00:00',
      recipients: 5320,
      status: 'delivered',
    },
  ]);
  const [isSending, setIsSending] = useState(false);
  const [alertsExpanded, setAlertsExpanded] = useState(false);
  const alertTypes = [
    {
      id: 'heat',
      name: 'Heat Warning',
      icon: Thermometer,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  ];
  const targetAreas = [
    { id: 'all', name: 'All Users', count: 5320 },
    { id: 'korangi', name: 'Korangi Industrial', count: 2847 },
    { id: 'saddar', name: 'Saddar', count: 1523 },
    { id: 'gulshan', name: 'Gulshan-e-Iqbal', count: 1892 },
    { id: 'dha', name: 'DHA', count: 1234 },
    { id: 'landhi', name: 'Landhi', count: 987 },
    { id: 'clifton', name: 'Clifton', count: 765 },
  ];
  const handleSendAlert = async () => {
    if (!alertForm.title || !alertForm.message) {
      toast.error('Please fill in all required fields');
      return;
    }
    setIsSending(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const newAlert = {
      id: Date.now(),
      title: alertForm.title,
      message: alertForm.message,
      severity: alertForm.severity,
      target:
        targetAreas.find((a) => a.id === alertForm.target)?.name || 'All Users',
      sentAt: new Date().toISOString(),
      recipients:
        targetAreas.find((a) => a.id === alertForm.target)?.count || 5320,
      status: 'delivered',
    };
    setRecentAlerts([newAlert, ...recentAlerts]);
    toast.success('Alert broadcasted successfully!');
    setAlertForm({
      title: '',
      message: '',
      severity: 'warning',
      target: 'all',
      type: 'heat',
    });
    setIsSending(false);
  };
  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
      case 'info':
        return <Info className="w-5 h-5 text-green-600" />;
      default:
        return <Bell className="w-5 h-5 text-slate-500" />;
    }
  };
  const getTargetCount = (targetId) => {
    return targetAreas.find((a) => a.id === targetId)?.count || 5320;
  };
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Alert System</h1>
          <p className="text-slate-500">
            Broadcast alerts and manage notifications
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="text-sm text-emerald-400">System Active</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 lg:grid-rows-2 gap-6">
        {/* Alert Composer */}
        <div className="lg:col-span-2 space-y-6">
          <AdminPanel
            title="Create Alert"
            subtitle="Compose and broadcast new alert"
            icon={Megaphone}
            iconColor="red"
          >
            <div className="space-y-6">
              {/* Alert Type */}
              <div>
                <label className="text-sm text-gray-700 mb-3 block">
                  Alert Type
                </label>
                <div className="flex flex-wrap gap-2">
                  {alertTypes.map((type) => {
                    const Icon = type.icon;
                    const isSelected = alertForm.type === type.id;
                    return (
                      <button
                        key={type.id}
                        onClick={() =>
                          setAlertForm((prev) => ({ ...prev, type: type.id }))
                        }
                        className={`
flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-200
${isSelected ? `${type.bgColor} ${type.color} border-current ring-1 ring-current` : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{type.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Title */}
              <div>
                <label className="text-sm text-gray-700 mb-2 block">
                  Alert Title
                </label>
                <input
                  type="text"
                  value={alertForm.title}
                  onChange={(e) =>
                    setAlertForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="e.g., Extreme Heat Warning"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-green-600 transition-colors"
                />
              </div>
              {/* Message */}
              <div>
                <label className="text-sm text-slate-700 font-bold mb-2 block">
                  Message
                </label>
                <textarea
                  value={alertForm.message}
                  onChange={(e) =>
                    setAlertForm((prev) => ({
                      ...prev,
                      message: e.target.value,
                    }))
                  }
                  placeholder="Enter alert message..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-green-600 transition-colors resize-none"
                />
                <p className="text-xs text-slate-400 mt-1 font-medium">
                  {alertForm.message.length}/500 characters
                </p>
              </div>
              {/* Severity & Target */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-700 mb-2 block">
                    Severity Level
                  </label>
                  <select
                    value={alertForm.severity}
                    onChange={(e) =>
                      setAlertForm((prev) => ({
                        ...prev,
                        severity: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-green-600 transition-colors"
                  >
                    <option value="critical">
                      Critical - Immediate action required
                    </option>
                    <option value="warning">Warning - Be prepared</option>
                    <option value="info">Info - General notice</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-700 mb-2 block">
                    Target Area
                  </label>
                  <select
                    value={alertForm.target}
                    onChange={(e) =>
                      setAlertForm((prev) => ({
                        ...prev,
                        target: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-green-600 transition-colors"
                  >
                    {targetAreas.map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.name} ({area.count.toLocaleString()} users)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {/* Preview */}
              <div className="p-4 rounded-xl bg-slate-50 border border-gray-200">
                <p className="text-xs text-gray-500 mb-3">Preview</p>
                <div className="p-4 rounded-lg bg-white border border-gray-200 shadow-sm">
                  <div className="flex items-start gap-3">
                    {getSeverityIcon(alertForm.severity)}
                    <div>
                      <p className="font-bold text-slate-900">
                        {alertForm.title || 'Alert Title'}
                      </p>
                      <p className="text-sm text-slate-600 font-medium mt-1">
                        {alertForm.message ||
                          'Alert message will appear here...'}
                      </p>
                      <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {targetAreas.find((a) => a.id === alertForm.target)
                            ?.name || 'All Users'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {getTargetCount(
                            alertForm.target
                          ).toLocaleString()}{' '}
                          recipients
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Send Button */}
              <button
                onClick={handleSendAlert}
                disabled={isSending}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-linear-to-r from-red-600 to-orange-600 text-white font-bold hover:from-red-700 hover:to-orange-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/30"
              >
                {isSending ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Broadcasting...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Broadcast Alert
                  </>
                )}
              </button>
            </div>
          </AdminPanel>
          {/* Alert Templates */}
          <AdminPanel
            title="Quick Templates"
            subtitle="Pre-defined alert messages"
            icon={Shield}
            iconColor="blue"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                {
                  title: 'Extreme Heat Warning',
                  type: 'heat',
                  severity: 'critical',
                  message:
                    'Temperatures expected to exceed 40°C. Stay indoors, stay hydrated, and avoid outdoor activities between 11 AM - 4 PM.',
                },
                {
                  title: 'Heat Advisory',
                  type: 'heat',
                  severity: 'warning',
                  message:
                    'High temperatures predicted. Drink plenty of water, wear light clothing, and limit sun exposure.',
                },
              ].map((template, index) => {
                const typeConfig = alertTypes.find(
                  (t) => t.id === template.type
                );
                const Icon = typeConfig?.icon || Bell;
                return (
                  <button
                    key={index}
                    onClick={() =>
                      setAlertForm({
                        title: template.title,
                        message: template.message,
                        severity: template.severity,
                        target: alertForm.target,
                        type: template.type,
                      })
                    }
                    className="text-left p-4 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-all duration-200 group shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-lg ${typeConfig?.bgColor || 'bg-slate-100'}`}
                      >
                        <Icon
                          className={`w-4 h-4 ${typeConfig?.color || 'text-gray-500'}`}
                        />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 group-hover:text-green-600 transition-colors">
                          {template.title}
                        </p>
                        <p className="text-xs text-slate-500 font-medium mt-1 line-clamp-2">
                          {template.message}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </AdminPanel>
        </div>
        {/* Alert History */}
        <div>
          <AdminPanel
            title="Recent Alerts"
            subtitle="Last 30 days"
            icon={Bell}
            iconColor="orange"
            className={
              alertsExpanded
                ? 'lg:row-span-2 flex flex-col'
                : 'h-[calc(100vh-200px)] min-h-150 flex flex-col'
            }
          >
            <div className="flex-1 overflow-y-auto space-y-4 pr-3 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 transition-colors scroll-smooth" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 #f1f5f9' }}>
              {recentAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-4 rounded-xl bg-white border border-gray-200 hover:bg-slate-50 transition-all duration-200 shadow-sm overflow-hidden w-full"
                >
                  <div className="mb-3 flex justify-end">
                    <StatusBadge
                      status={
                        alert.status === 'delivered'
                          ? 'validated'
                          : 'pending'
                      }
                      size="sm"
                    />
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 mt-1">
                      {getSeverityIcon(alert.severity)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="mb-2">
                        <h3 className="font-bold text-slate-900 leading-snug text-lg whitespace-normal wrap-break-word">
                          {alert.title}
                        </h3>
                      </div>
                      <p className="text-sm text-slate-600 font-medium line-clamp-2 mb-3">
                        {alert.message}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                        <span className="flex items-center gap-1 min-w-0">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{alert.target}</span>
                        </span>
                        <span className="flex items-center gap-1 min-w-0">
                          <Users className="w-3 h-3 shrink-0" />
                          <span className="truncate">{alert.recipients.toLocaleString()} reached</span>
                        </span>
                        <span className="flex items-center gap-1 min-w-0">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span className="truncate">{new Date(alert.sentAt).toLocaleDateString()}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setAlertsExpanded((s) => !s)}
              className="w-full py-3 text-sm text-slate-500 font-bold hover:text-green-600 transition-colors border-t border-slate-100 mt-auto"
            >
              {alertsExpanded ? 'Collapse Alert History' : 'View All Alert History'}
            </button>
          </AdminPanel>
        </div>
      </div>
    </div>
  );
}
export default AlertSystem;
