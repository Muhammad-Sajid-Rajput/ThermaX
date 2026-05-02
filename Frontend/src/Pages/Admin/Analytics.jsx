import { useState } from 'react';
import { AdminPanel } from '../../components/admin';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Filter,
  MapPin,
  Users,
  FileText,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
} from 'lucide-react';
// Simple bar chart component
const BarChart = ({ data, color = '#FF6B35' }) => {
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-2 h-32">
      {data.map((item, index) => (
        <div key={index} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full rounded-t-lg transition-all duration-500"
            style={{
              height: `${(item.value / max) * 100}%`,
              backgroundColor: color,
              opacity: 0.6 + (index / data.length) * 0.4,
            }}
          ></div>
          <span className="text-xs text-slate-500 font-medium">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
};
// Line chart component
const LineChart = ({ data, color = '#10B981' }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 80 - 10;
      return `${x},${y}`;
    })
    .join('');
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="w-full h-40"
    >
      <defs>
        <linearGradient
          id={`lineGradient-${color.replace('#', '')}`}
          x1="0%"
          y1="0%"
          x2="0%"
          y2="100%"
        >
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        fill={`url(#lineGradient-${color.replace('#', '')})`}
        points={`0,100 ${points} 100,100`}
      />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        points={points}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};
// Donut chart component
const DonutChart = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = 0;
  return (
    <div className="relative w-40 h-40">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        {data.map((item, index) => {
          const angle = (item.value / total) * 360;
          const startAngle = currentAngle;
          currentAngle += angle;
          const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
          const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
          const x2 = 50 + 40 * Math.cos(((startAngle + angle) * Math.PI) / 180);
          const y2 = 50 + 40 * Math.sin(((startAngle + angle) * Math.PI) / 180);
          const largeArc = angle > 180 ? 1 : 0;
          return (
            <path
              key={index}
              d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
              fill={item.color}
            />
          );
        })}
        <circle cx="50" cy="50" r="25" fill="#ffffff" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-slate-900">{total}</span>
      </div>
    </div>
  );
};
function Analytics() {
  const [timeRange, setTimeRange] = useState('7d');
  const heatTrendData = [
    { label: 'Mon', value: 35 },
    { label: 'Tue', value: 38 },
    { label: 'Wed', value: 42 },
    { label: 'Thu', value: 39 },
    { label: 'Fri', value: 45 },
    { label: 'Sat', value: 43 },
    { label: 'Sun', value: 40 },
  ];
  const reportData = [12, 15, 18, 14, 22, 19, 25, 21, 28, 24, 30, 26];
  const userActivityData = [45, 52, 48, 58, 55, 62, 68, 65, 72, 70, 78, 75];
  const areaDistribution = [
    { name: 'Korangi', value: 35, color: '#EF4444' },
    { name: 'Saddar', value: 28, color: '#F97316' },
    { name: 'Gulshan', value: 20, color: '#EAB308' },
    { name: 'DHA', value: 12, color: '#3B82F6' },
    { name: 'Others', value: 5, color: '#6B7280' },
  ];
  const stats = [
    {
      title: 'Report Volume',
      value: '2,847',
      change: '+18%',
      trend: 'up',
      icon: FileText,
      color: 'blue',
    },
    {
      title: 'Avg. Severity',
      value: '3.9',
      change: '+8%',
      trend: 'down',
      icon: Flame,
      color: 'red',
    },
    {
      title: 'User Engagement',
      value: '78%',
      change: '+12%',
      trend: 'up',
      icon: Users,
      color: 'green',
    },
    {
      title: 'Response Time',
      value: '4.2h',
      change: '-15%',
      trend: 'up',
      icon: TrendingUp,
      color: 'purple',
    },
  ];
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Analytics Dashboard
          </h1>
          <p className="text-slate-500">
            Heat intelligence insights and trends
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-green-600"
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const TrendIcon = stat.trend === 'up' ? ArrowUpRight : ArrowDownRight;
          const trendColor =
            stat.trend === 'up' ? 'text-emerald-400' : 'text-red-400';
          return (
            <div
              key={index}
              className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`p-2 rounded-lg ${
                    stat.color === 'blue'
                      ? 'bg-green-500/10 text-green-500'
                      : stat.color === 'red'
                        ? 'bg-red-500/10 text-red-500'
                        : stat.color === 'green'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-green-500/10 text-green-500'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div
                  className={`flex items-center gap-1 text-sm ${trendColor}`}
                >
                  <TrendIcon className="w-4 h-4" />
                  {stat.change}
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-sm text-slate-500">{stat.title}</p>
            </div>
          );
        })}
      </div>
      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Heat Trends */}
        <AdminPanel
          title="Heat Trends Over Time"
          subtitle="Average temperature by day"
          icon={TrendingUp}
          iconColor="orange"
        >
          <BarChart data={heatTrendData} color="#FF6B35" />
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
            <div>
              <p className="text-sm text-slate-500 font-medium">
                Weekly Average
              </p>
              <p className="text-xl font-bold text-slate-900">39.4°C</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">Peak Day</p>
              <p className="text-xl font-bold text-green-600">Friday</p>
            </div>
          </div>
        </AdminPanel>
        {/* Report Frequency */}
        <AdminPanel
          title="Report Frequency"
          subtitle="Daily report submissions"
          icon={FileText}
          iconColor="blue"
        >
          <LineChart data={reportData} color="#0EA5E9" />
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
            <div>
              <p className="text-sm text-slate-500 font-medium">
                Total Reports
              </p>
              <p className="text-xl font-bold text-slate-900">264</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500 font-medium">Peak Hour</p>
              <p className="text-xl font-bold text-green-500">2:00 PM</p>
            </div>
          </div>
        </AdminPanel>
        {/* User Activity */}
        <AdminPanel
          title="User Activity"
          subtitle="Active users over time"
          icon={Users}
          iconColor="green"
        >
          <LineChart data={userActivityData} color="#10B981" />
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
            <div>
              <p className="text-sm text-slate-500 font-medium">
                Avg. Daily Active
              </p>
              <p className="text-xl font-bold text-slate-900">62.4</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500 font-medium">Growth Rate</p>
              <p className="text-xl font-bold text-emerald-500">+12%</p>
            </div>
          </div>
        </AdminPanel>
        {/* Area Distribution */}
        <AdminPanel
          title="Critical Zone Distribution"
          subtitle="Heat reports by area"
          icon={MapPin}
          iconColor="red"
        >
          <div className="flex items-center justify-between">
            <DonutChart data={areaDistribution} />
            <div className="space-y-2">
              {areaDistribution.map((area, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: area.color }}
                  ></div>
                  <span className="text-sm text-slate-600 font-medium w-20">
                    {area.name}
                  </span>
                  <span className="text-sm font-bold text-slate-900">
                    {area.value}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </AdminPanel>
      </div>
      {/* Bottom Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AdminPanel
          title="Area Comparison"
          subtitle="Temperature comparison by district"
          icon={Filter}
          iconColor="purple"
        >
          <div className="space-y-3">
            {[
              { area: 'Korangi Industrial', temp: 42.3, status: 'Critical' },
              { area: 'Saddar', temp: 39.8, status: 'High' },
              { area: 'Landhi', temp: 38.5, status: 'High' },
              { area: 'Gulshan', temp: 35.2, status: 'Moderate' },
              { area: 'DHA', temp: 33.1, status: 'Moderate' },
            ].map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200"
              >
                <span className="text-sm text-slate-700 font-medium">
                  {item.area}
                </span>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-sm font-medium ${
                      item.temp >= 40
                        ? 'text-red-500'
                        : item.temp >= 35
                          ? 'text-orange-500'
                          : 'text-yellow-500'
                    }`}
                  >
                    {item.temp}°C
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      item.status === 'Critical'
                        ? 'bg-red-500/10 text-red-500'
                        : item.status === 'High'
                          ? 'bg-orange-500/10 text-orange-500'
                          : 'bg-yellow-500/10 text-yellow-500'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </AdminPanel>
        <AdminPanel
          title="Response Metrics"
          subtitle="System performance indicators"
          icon={TrendingUp}
          iconColor="blue"
        >
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-slate-500 font-medium">
                  Report Validation
                </span>
                <span className="text-sm text-emerald-500 font-bold">94%</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full w-[94%] bg-emerald-500 rounded-full"></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-slate-500 font-medium">
                  Alert Delivery
                </span>
                <span className="text-sm text-emerald-500 font-bold">98%</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full w-[98%] bg-emerald-500 rounded-full"></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-slate-500 font-medium">
                  Data Sync
                </span>
                <span className="text-sm text-green-500 font-bold">87%</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full w-[87%] bg-green-500 rounded-full"></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-slate-500 font-medium">
                  API Health
                </span>
                <span className="text-sm text-emerald-500 font-bold">100%</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full w-full bg-emerald-500 rounded-full"></div>
              </div>
            </div>
          </div>
        </AdminPanel>
        <AdminPanel
          title="System Health"
          subtitle="Platform performance"
          icon={Flame}
          iconColor="green"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-sm text-emerald-600">API Status</span>
              </div>
              <span className="text-sm font-medium text-gray-800">Online</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-sm text-emerald-600">Database</span>
              </div>
              <span className="text-sm font-medium text-gray-800">Healthy</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-sm text-emerald-600">ML Models</span>
              </div>
              <span className="text-sm font-medium text-gray-800">Active</span>
            </div>
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 font-medium">
                  Uptime
                </span>
                <span className="text-lg font-bold text-slate-900">99.8%</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Last 30 days</p>
            </div>
          </div>
        </AdminPanel>
      </div>
    </div>
  );
}
export default Analytics;
