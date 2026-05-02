import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Thermometer,
  MapPin,
  AlertTriangle,
  Satellite,
} from 'lucide-react';
const TONE_CONFIG = {
  neutral: {
    bg: 'bg-gradient-to-br from-slate-50 to-slate-100',
    border: 'border-slate-200',
    icon: 'bg-slate-100 text-slate-600',
    value: 'text-slate-900',
    label: 'text-slate-600',
    change: 'text-slate-500',
    glow: '',
  },
  warm: {
    bg: 'bg-gradient-to-br from-orange-50 to-amber-50',
    border: 'border-orange-200',
    icon: 'bg-orange-100 text-orange-600',
    value: 'text-orange-900',
    label: 'text-orange-700',
    change: 'text-orange-500',
    glow: 'shadow-orange-100',
  },
  hot: {
    bg: 'bg-gradient-to-br from-red-50 to-rose-50',
    border: 'border-red-200',
    icon: 'bg-red-100 text-red-600',
    value: 'text-red-900',
    label: 'text-red-700',
    change: 'text-red-500',
    glow: 'shadow-red-100',
  },
  cool: {
    bg: 'bg-gradient-to-br from-green-50 to-emerald-50',
    border: 'border-green-200',
    icon: 'bg-green-100 text-green-700',
    value: 'text-green-900',
    label: 'text-green-800',
    change: 'text-green-600',
    glow: 'shadow-green-100',
  },
};
const ICON_MAP = [
  <MapPin className="w-5 h-5" />,
  <AlertTriangle className="w-5 h-5" />,
  <Thermometer className="w-5 h-5" />,
  <Satellite className="w-5 h-5" />,
];
const KpiCards = ({ kpis = [] }) => {
  // Default placeholder data if no kpis passed
  const displayKpis =
    kpis.length > 0
      ? kpis
      : [
          {
            label: 'Total Reports',
            value: '—',
            change: 'Loading...',
            tone: 'neutral',
          },
          {
            label: 'Active Hotspots',
            value: '—',
            change: 'Loading...',
            tone: 'warm',
          },
          {
            label: 'Avg Severity',
            value: '—',
            change: 'Loading...',
            tone: 'hot',
          },
          {
            label: 'Satellite Correlation',
            value: '—',
            change: 'Loading...',
            tone: 'cool',
          },
        ];
  return (
    <>
      {displayKpis.map((kpi, index) => {
        const config = TONE_CONFIG[kpi.tone] ?? TONE_CONFIG.neutral;
        return (
          <div
            key={index}
            className={`
relative overflow-hidden rounded-xl border p-5 shadow-sm transition-all duration-200
hover:shadow-md hover:-translate-y-0.5
${config.bg} ${config.border} ${config.glow}`}
          >
            {/* Top row: label + icon */}
            <div className="flex items-start justify-between mb-3">
              <p
                className={`text-xs font-semibold uppercase tracking-wider ${config.label}`}
              >
                {kpi.label}
              </p>
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center ${config.icon}`}
              >
                {ICON_MAP[index % ICON_MAP.length]}
              </div>
            </div>
            {/* Value */}
            <div
              className={`text-3xl font-bold tracking-tight mb-1 ${config.value}`}
            >
              {kpi.value}
            </div>
            {/* Change */}
            <p className={`text-xs ${config.change} leading-snug`}>
              {kpi.change}
            </p>
            {/* Decorative corner */}
            <div
              className={`absolute -bottom-3 -right-3 w-16 h-16 rounded-full opacity-10 ${config.icon}`}
            />
          </div>
        );
      })}
    </>
  );
};
export default KpiCards;
