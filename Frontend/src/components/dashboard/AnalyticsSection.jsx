import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { TrendingUp, BarChart2, Activity, Flame } from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  RadialBarChart,
  RadialBar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
const PRIORITY_COLORS = {
  Critical: '#dc2626',
  High: '#f97316',
  Medium: '#facc15',
  Low: '#65a30d',
};
const SEVERITY_COLORS = ['#2a9d8f', '#60a5fa', '#facc15', '#f97316', '#dc2626'];
const SEVERITY_LABELS = [
  '',
  'S1 (Low)',
  'S2 (Mild)',
  'S3 (Moderate)',
  'S4 (High)',
  'S5 (Critical)',
];
// ─── Custom Tooltip ─────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};
// ─── Report Trend (AreaChart) ──────────────────────────────────────────
const TrendChart = ({ trend = [], onBarClick }) => {
  const data = useMemo(
    () =>
      trend.map((t) => ({
        date: t.date ?? t.label ?? '',
        reports: t.reports ?? t.value ?? 0,
      })),
    [trend]
  );
  if (!data.length) {
    return (
      <div className="h-24 flex items-center justify-center text-slate-400 text-sm">
        No trend data
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={140}>
      <AreaChart
        data={data}
        margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
      >
        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          tick={{ fontSize: 9, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis hide />
        <CartesianGrid
          vertical={false}
          strokeDasharray="3 3"
          stroke="#f1f5f9"
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="reports"
          name="Reports"
          stroke="#16a34a"
          strokeWidth={2}
          fill="url(#trendGrad)"
          animationDuration={800}
          onClick={(data) => onBarClick?.('date', data?.date)}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
// ─── Severity Distribution (BarChart) ──────────────────────────────────
const SeverityChart = ({ severity = [], onBarClick }) => {
  const data = useMemo(
    () =>
      severity.map((s) => ({
        severity: s.severity ?? s.label ?? '?',
        value: s.value ?? 0,
      })),
    [severity]
  );
  if (!data.length) {
    return (
      <div className="h-24 flex items-center justify-center text-slate-400 text-sm">
        No severity data
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <XAxis
          dataKey="severity"
          tick={{ fontSize: 9, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis hide />
        <CartesianGrid
          vertical={false}
          strokeDasharray="3 3"
          stroke="#f1f5f9"
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey="value"
          name="Reports"
          radius={[4, 4, 0, 0]}
          animationDuration={800}
          onClick={(data) => onBarClick?.('severity', data?.severity)}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={SEVERITY_COLORS[entry.severity] ?? '#16a34a'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
// ─── Area Heat Index (RadialBarChart) ──────────────────────────────────
const HeatIndexChart = ({ hotspotGrowth = [] }) => {
  const data = useMemo(
    () =>
      hotspotGrowth.map((h, i) => ({
        area: h.area ?? `Area ${i}`,
        growth: Math.min(h.growth ?? 0, 100),
        priority: h.priority ?? 'Low',
        fill: PRIORITY_COLORS[h.priority] ?? '#65a30d',
      })),
    [hotspotGrowth]
  );
  if (!data.length) {
    return (
      <div className="h-24 flex items-center justify-center text-slate-400 text-sm">
        No area data
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={160}>
      <RadialBarChart
        cx="50%"
        cy="50%"
        innerRadius="30%"
        outerRadius="90%"
        data={data}
        startAngle={90}
        endAngle={-270}
      >
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0]?.payload;
            return (
              <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
                <p className="font-semibold text-slate-700">{d?.area}</p>
                <p style={{ color: d?.fill }} className="font-medium">
                  Growth: {d?.growth?.toFixed(0)}%
                </p>
                <p className="text-slate-500">Priority: {d?.priority}</p>
              </div>
            );
          }}
        />
        <RadialBar
          dataKey="growth"
          background={{ fill: '#f1f5f9' }}
          animationDuration={800}
          cornerRadius={4}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.fill} />
          ))}
        </RadialBar>
      </RadialBarChart>
    </ResponsiveContainer>
  );
};
// ─── AnalyticsSection ──────────────────────────────────────────────────
const AnalyticsSection = ({ charts = {}, onFilterChange }) => {
  const { trend = [], severity = [], hotspotGrowth = [] } = charts;
  const handleFilterClick = (type, value) => {
    onFilterChange?.(type, value);
  };
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Report Trend */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-green-600" />
              Report Trend
            </CardTitle>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">
              7-day
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <TrendChart trend={trend} onBarClick={handleFilterClick} />
        </CardContent>
      </Card>
      {/* Severity Distribution */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <BarChart2 className="w-4 h-4 text-orange-500" />
              Severity Mix
            </CardTitle>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">
              S1–S5
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <SeverityChart severity={severity} onBarClick={handleFilterClick} />
        </CardContent>
      </Card>
      {/* Area Heat Index */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-red-500" />
              Area Heat Index
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <HeatIndexChart hotspotGrowth={hotspotGrowth} />
        </CardContent>
      </Card>
    </div>
  );
};
export default AnalyticsSection;
