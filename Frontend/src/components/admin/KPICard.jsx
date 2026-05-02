import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
const KPICard = ({
  title,
  value,
  change,
  changeType = 'neutral', //'up','down','neutral'
  icon: Icon,
  color = 'green', //'red','orange','green','blue','purple'
  trend,
  glow = false,
  onClick,
}) => {
  const colorConfigs = {
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      text: 'text-red-600',
      glow: 'shadow-lg shadow-red-500/10',
    },
    orange: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      text: 'text-orange-600',
      glow: 'shadow-lg shadow-orange-500/10',
    },
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      text: 'text-green-600',
      glow: 'shadow-lg shadow-green-500/10',
    },
    blue: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      text: 'text-green-600',
      glow: 'shadow-lg shadow-green-500/10',
    },
    purple: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      text: 'text-purple-600',
      glow: 'shadow-lg shadow-purple-500/10',
    },
  };
  const config = colorConfigs[color] || colorConfigs.blue;
  const getTrendIcon = () => {
    if (changeType === 'up') return <TrendingUp className="w-3 h-3" />;
    if (changeType === 'down') return <TrendingDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };
  const getTrendColor = () => {
    if (changeType === 'up') return 'text-green-600';
    if (changeType === 'down') return 'text-red-600';
    return 'text-slate-500';
  };
  return (
    <div
      onClick={onClick}
      className={`
relative overflow-hidden rounded-2xl border p-6 bg-white
${config.border}
transition-all duration-300 ease-out
hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-lg
${glow ? config.glow : ''}
${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* Background glow effect */}
      <div
        className={`absolute -top-10 -right-10 w-32 h-32 rounded-full ${config.bg} blur-3xl opacity-60`}
      ></div>
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">
              {title}
            </p>
            <p className="text-3xl font-bold text-slate-900 mt-1 tracking-tight">
              {value}
            </p>
          </div>
          <div
            className={`p-3 rounded-xl ${config.iconBg} ${config.iconColor}`}
          >
            <Icon className="w-6 h-6" />
          </div>
        </div>
        {change && (
          <div className="flex items-center gap-2">
            <span
              className={`flex items-center gap-1 text-sm font-medium ${getTrendColor()}`}
            >
              {getTrendIcon()}
              {change}
            </span>
            {trend && <span className="text-xs text-slate-500">{trend}</span>}
          </div>
        )}
      </div>
      {/* Animated border glow on hover */}
      <div
        className={`absolute inset-0 rounded-2xl ${config.border} opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none`}
      ></div>
    </div>
  );
};
export default KPICard;
