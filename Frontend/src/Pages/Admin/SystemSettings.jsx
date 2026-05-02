import { useState } from 'react';
import { AdminPanel } from '../../components/admin';
import { toast } from 'react-hot-toast';
import {
  Settings,
  Shield,
  Bell,
  Database,
  Globe,
  Palette,
  Lock,
  Save,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  Server,
  HardDrive,
  Cpu,
  Wifi,
} from 'lucide-react';
function SystemSettings() {
  const [settings, setSettings] = useState({
    // General
    platformName: 'ThermaX',
    maintenanceMode: false,
    allowRegistration: true,
    // Thresholds
    criticalTemp: 40,
    highTemp: 35,
    moderateTemp: 30,
    // Notifications
    emailAlerts: true,
    pushNotifications: true,
    smsAlerts: false,
    alertCooldown: 30, // minutes
    // Features
    mlPredictions: true,
    heatmapClustering: true,
    autoModeration: false,
    realTimeUpdates: true,
    // Privacy
    publicReports: false,
    anonymizeData: true,
    dataRetention: 90, // days
  });
  const [isSaving, setIsSaving] = useState(false);
  const handleToggle = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.success('Settings saved successfully');
    setIsSaving(false);
  };
  const ToggleSwitch = ({ enabled, onChange }) => (
    <button
      onClick={onChange}
      className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
        enabled ? 'bg-green-600' : 'bg-slate-300'
      }`}
    >
      <span
        className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
          enabled ? 'translate-x-6' : 'translate-x-0'
        }`}
      />
    </button>
  );
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Settings</h1>
          <p className="text-slate-500">
            Configure platform-wide settings and preferences
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 transition-colors disabled:opacity-50 shadow-md"
        >
          {isSaving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Changes
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <AdminPanel
          title="General Settings"
          subtitle="Platform configuration"
          icon={Settings}
          iconColor="blue"
        >
          <div className="space-y-5">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                Platform Name
              </label>
              <input
                type="text"
                value={settings.platformName}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    platformName: e.target.value,
                  }))
                }
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-green-600 transition-colors"
              />
            </div>
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <div>
                <p className="font-bold text-slate-900">Maintenance Mode</p>
                <p className="text-sm text-slate-500 font-medium">
                  Put the platform in maintenance mode
                </p>
              </div>
              <ToggleSwitch
                enabled={settings.maintenanceMode}
                onChange={() => handleToggle('maintenanceMode')}
              />
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-bold text-slate-900">Allow Registration</p>
                <p className="text-sm text-slate-500">Let new users sign up</p>
              </div>
              <ToggleSwitch
                enabled={settings.allowRegistration}
                onChange={() => handleToggle('allowRegistration')}
              />
            </div>
          </div>
        </AdminPanel>
        {/* Temperature Thresholds */}
        <AdminPanel
          title="Temperature Thresholds"
          subtitle="Heat alert levels"
          icon={AlertTriangle}
          iconColor="red"
        >
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-red-400">Critical (≥°C)</label>
                <span className="text-sm text-slate-900 font-mono font-bold">
                  {settings.criticalTemp}°C
                </span>
              </div>
              <input
                type="range"
                min="35"
                max="50"
                value={settings.criticalTemp}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    criticalTemp: parseInt(e.target.value),
                  }))
                }
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-orange-400">High (≥°C)</label>
                <span className="text-sm text-slate-900 font-mono font-bold">
                  {settings.highTemp}°C
                </span>
              </div>
              <input
                type="range"
                min="30"
                max="45"
                value={settings.highTemp}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    highTemp: parseInt(e.target.value),
                  }))
                }
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-yellow-400">
                  Moderate (≥°C)
                </label>
                <span className="text-sm text-slate-900 font-mono font-bold">
                  {settings.moderateTemp}°C
                </span>
              </div>
              <input
                type="range"
                min="25"
                max="40"
                value={settings.moderateTemp}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    moderateTemp: parseInt(e.target.value),
                  }))
                }
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
              />
            </div>
          </div>
        </AdminPanel>
        {/* Notification Settings */}
        <AdminPanel
          title="Notifications"
          subtitle="Alert delivery preferences"
          icon={Bell}
          iconColor="orange"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <div>
                <p className="font-bold text-slate-900">Email Alerts</p>
                <p className="text-sm text-slate-500 font-medium">
                  Send alerts via email
                </p>
              </div>
              <ToggleSwitch
                enabled={settings.emailAlerts}
                onChange={() => handleToggle('emailAlerts')}
              />
            </div>
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <div>
                <p className="font-bold text-slate-900">Push Notifications</p>
                <p className="text-sm text-slate-500 font-medium">
                  Browser and app push notifications
                </p>
              </div>
              <ToggleSwitch
                enabled={settings.pushNotifications}
                onChange={() => handleToggle('pushNotifications')}
              />
            </div>
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <div>
                <p className="font-bold text-slate-900">SMS Alerts</p>
                <p className="text-sm text-slate-500 font-medium">
                  Send critical alerts via SMS
                </p>
              </div>
              <ToggleSwitch
                enabled={settings.smsAlerts}
                onChange={() => handleToggle('smsAlerts')}
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                Alert Cooldown
              </label>
              <select
                value={settings.alertCooldown}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    alertCooldown: parseInt(e.target.value),
                  }))
                }
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-green-600 transition-colors"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={120}>2 hours</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Minimum time between similar alerts
              </p>
            </div>
          </div>
        </AdminPanel>
        {/* Feature Toggles */}
        <AdminPanel
          title="Features"
          subtitle="Enable or disable platform features"
          icon={Shield}
          iconColor="purple"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <div>
                <p className="font-bold text-slate-900">ML Predictions</p>
                <p className="text-sm text-slate-500 font-medium">
                  AI-powered heat predictions
                </p>
              </div>
              <ToggleSwitch
                enabled={settings.mlPredictions}
                onChange={() => handleToggle('mlPredictions')}
              />
            </div>
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <div>
                <p className="font-bold text-slate-900">Heatmap Clustering</p>
                <p className="text-sm text-slate-500 font-medium">
                  Group nearby heat reports
                </p>
              </div>
              <ToggleSwitch
                enabled={settings.heatmapClustering}
                onChange={() => handleToggle('heatmapClustering')}
              />
            </div>
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <div>
                <p className="font-bold text-slate-900">Auto Moderation</p>
                <p className="text-sm text-slate-500 font-medium">
                  Automatically moderate reports
                </p>
              </div>
              <ToggleSwitch
                enabled={settings.autoModeration}
                onChange={() => handleToggle('autoModeration')}
              />
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-white">Real-time Updates</p>
                <p className="text-sm text-gray-500">
                  Live map and dashboard updates
                </p>
              </div>
              <ToggleSwitch
                enabled={settings.realTimeUpdates}
                onChange={() => handleToggle('realTimeUpdates')}
              />
            </div>
          </div>
        </AdminPanel>
        {/* Privacy Settings */}
        <AdminPanel
          title="Privacy & Data"
          subtitle="Data handling preferences"
          icon={Lock}
          iconColor="green"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <div>
                <p className="font-bold text-slate-900">Public Reports</p>
                <p className="text-sm text-slate-500 font-medium">
                  Allow public access to heat reports
                </p>
              </div>
              <ToggleSwitch
                enabled={settings.publicReports}
                onChange={() => handleToggle('publicReports')}
              />
            </div>
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <div>
                <p className="font-bold text-slate-900">Anonymize Data</p>
                <p className="text-sm text-slate-500 font-medium">
                  Remove PII from analytics
                </p>
              </div>
              <ToggleSwitch
                enabled={settings.anonymizeData}
                onChange={() => handleToggle('anonymizeData')}
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                Data Retention (days)
              </label>
              <select
                value={settings.dataRetention}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    dataRetention: parseInt(e.target.value),
                  }))
                }
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-green-600 transition-colors"
              >
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
                <option value={180}>6 months</option>
                <option value={365}>1 year</option>
              </select>
            </div>
          </div>
        </AdminPanel>
        {/* System Status */}
        <AdminPanel
          title="System Status"
          subtitle="Current system health"
          icon={Server}
          iconColor="emerald"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-emerald-400">API Server</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                <span className="text-sm text-slate-900 font-bold">Online</span>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-emerald-400">Database</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                <span className="text-sm text-slate-900 font-bold">
                  Healthy
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-emerald-400">WebSocket</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                <span className="text-sm text-slate-900 font-bold">
                  Connected
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-center">
                <Cpu className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-slate-900">24%</p>
                <p className="text-xs text-slate-500">CPU Usage</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-center">
                <HardDrive className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-slate-900">67%</p>
                <p className="text-xs text-slate-500">Storage</p>
              </div>
            </div>
          </div>
        </AdminPanel>
      </div>
      {/* Danger Zone */}
      <AdminPanel
        title="Danger Zone"
        subtitle="Irreversible actions"
        icon={AlertTriangle}
        iconColor="red"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <div>
              <p className="font-medium text-red-400">Reset All Settings</p>
              <p className="text-sm text-gray-500">
                Restore default configuration
              </p>
            </div>
            <button
              onClick={() => {
                if (
                  confirm(
                    'Are you sure? This will reset all settings to defaults.'
                  )
                ) {
                  toast.success('Settings reset to defaults');
                }
              }}
              className="px-4 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
            >
              Reset
            </button>
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <div>
              <p className="font-medium text-red-400">Clear All Data</p>
              <p className="text-sm text-gray-500">
                Delete all reports and user data
              </p>
            </div>
            <button
              onClick={() => {
                if (
                  confirm(
                    'WARNING: This will delete ALL data permanently. This action cannot be undone.'
                  )
                ) {
                  toast.error('This action requires admin verification');
                }
              }}
              className="px-4 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
            >
              Delete All
            </button>
          </div>
        </div>
      </AdminPanel>
    </div>
  );
}
export default SystemSettings;
