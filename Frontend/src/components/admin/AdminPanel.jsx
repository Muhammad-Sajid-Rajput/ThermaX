import React from 'react';
import { ChevronRight } from 'lucide-react';
const AdminPanel = ({
  title,
  subtitle,
  icon: Icon,
  iconColor = 'green',
  action,
  actionLabel,
  onAction,
  children,
  className = '',
  headerClassName = '',
}) => {
  const colorConfigs = {
    red: 'text-red-600 bg-red-100',
    orange: 'text-orange-600 bg-orange-100',
    green: 'text-green-700 bg-green-50',
    blue: 'text-blue-600 bg-blue-100',
    purple: 'text-purple-600 bg-purple-100',
    yellow: 'text-amber-600 bg-amber-100',
  };
  const iconConfig = colorConfigs[iconColor] || colorConfigs.blue;
  return (
    <div
      className={`
bg-white rounded-2xl border border-slate-200 shadow-sm
overflow-hidden transition-all duration-300
hover:border-slate-300 hover:shadow-lg
${className}`}
    >
      {/* Header */}
      <div
        className={`
flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 sm:py-4
border-b border-slate-100 ${headerClassName}`}
      >
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          {Icon && (
            <div className={`p-2 rounded-lg shrink-0 ${iconConfig}`}>
              {React.isValidElement(Icon) ? Icon : <Icon className="w-5 h-5" />}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-sm sm:text-base lg:text-lg font-bold text-slate-900 leading-tight truncate">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs sm:text-sm text-slate-500 font-medium truncate mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {action && (
          <button
            onClick={onAction}
            className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors group"
          >
            <span>{actionLabel || 'View All'}</span>
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}
      </div>
      {/* Content */}
      <div className="flex-1 p-6 overflow-visible min-h-0 flex flex-col">{children}</div>
    </div>
  );
};
export default AdminPanel;
