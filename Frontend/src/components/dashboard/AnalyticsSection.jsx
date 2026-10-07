import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { BarChart2, Activity, Flame } from 'lucide-react';
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
  Moderate: '#f59e0b',
  Medium: '#f59e0b',
  Low: '#eab308',
};

const SEVERITY_COLOR_MAP = {
  1: '#10b981',
  2: '#60a5fa',
  3: '#facc15',
  4: '#f97316',
  5: '#dc2626',
  S1: '#10b981',
  S2: '#60a5fa',
  S3: '#facc15',
  S4: '#f97316',
  S5: '#dc2626',
};

const SEVERITY_FALLBACKS = ['#10b981', '#60a5fa', '#facc15', '#f97316', '#dc2626'];

// ─── Custom Tooltip ─────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900/95 text-white px-3 py-2 rounded-lg text-xs shadow-xl border border-slate-800">
      <p className="font-semibold text-slate-300 mb-0.5">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || '#34d399' }} className="font-bold">
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
        reports: t.reports ?? t.value ?? t.count ?? 0,
      })),
    [trend]
  );

  if (!data.length) {
    return (
      <div className="h-28 flex items-center justify-center text-slate-400 text-xs italic">
        No trend data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={140} minWidth={0}>
      <AreaChart
        data={data}
        margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
        onClick={(state) => state?.activeLabel && onBarClick?.('date', state.activeLabel)}
      >
        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
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
          stroke="#10b981"
          strokeWidth={2}
          fill="url(#trendGrad)"
          animationDuration={800}
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
        value: s.value ?? s.count ?? 0,
      })),
    [severity]
  );

  if (!data.length) {
    return (
      <div className="h-28 flex items-center justify-center text-slate-400 text-xs italic">
        No severity data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={140} minWidth={0}>
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
          onClick={(d) => onBarClick?.('severity', d?.severity)}
        >
          {data.map((entry, i) => {
            const fill =
              SEVERITY_COLOR_MAP[entry.severity] ??
              SEVERITY_FALLBACKS[i % SEVERITY_FALLBACKS.length];
            return <Cell key={i} fill={fill} />;
          })}
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
        growth: Math.min(Math.max(h.growth ?? 0, 0), 100),
        priority: h.priority ?? 'Moderate',
        fill: PRIORITY_COLORS[h.priority] ?? '#f59e0b',
      })),
    [hotspotGrowth]
  );

  if (!data.length) {
    return (
      <div className="h-28 flex items-center justify-center text-slate-400 text-xs italic">
        No area data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={150} minWidth={0}>
      <RadialBarChart
        cx="50%"
        cy="50%"
        innerRadius="25%"
        outerRadius="95%"
        data={data}
        startAngle={90}
        endAngle={-270}
      >
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0]?.payload;
            return (
              <div className="bg-slate-900/95 text-white px-3 py-2 rounded-lg text-xs shadow-xl border border-slate-800">
                <p className="font-semibold text-slate-300 mb-0.5">{d?.area}</p>
                <p style={{ color: d?.fill }} className="font-bold">
                  Heat Index: {d?.growth?.toFixed(0)}%
                </p>
                <p className="text-slate-400 text-[11px]">Risk Tier: {d?.priority}</p>
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
const AnalyticsSection = ({ charts = {}, onFilterChange, days, className = '' }) => {
  const { trend = [], severity = [], hotspotGrowth = [] } = charts;
  const handleFilterClick = (type, value) => {
    onFilterChange?.(type, value);
  };
  const timeLabel = days ? `${days}-day` : '7-day';

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${className}`}>
      {/* Report Trend */}
      <Card className="lg:col-span-1 shadow-2xs border-slate-200">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-slate-900">
              <Activity className="w-4 h-4 text-emerald-600" />
              Report Trend
            </CardTitle>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              {timeLabel}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <TrendChart trend={trend} onBarClick={handleFilterClick} />
        </CardContent>
      </Card>

      {/* Severity Distribution */}
      <Card className="lg:col-span-1 shadow-2xs border-slate-200">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-slate-900">
              <BarChart2 className="w-4 h-4 text-orange-500" />
              Severity Mix
            </CardTitle>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              S1–S5
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <SeverityChart severity={severity} onBarClick={handleFilterClick} />
        </CardContent>
      </Card>

      {/* Area Heat Index */}
      <Card className="lg:col-span-1 shadow-2xs border-slate-200">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-slate-900">
              <Flame className="w-4 h-4 text-red-500" />
              Area Heat Index
            </CardTitle>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              TVI Risk
            </span>
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
