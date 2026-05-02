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
    blue: 'text-green-600 bg-green-100',
    purple: 'text-green-600 bg-green-100',
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
flex items-center justify-between px-6 py-4
border-b border-slate-100 ${headerClassName}`}
      >
        <div className="flex items-center gap-3">
          {Icon && (
            <div className={`p-2 rounded-lg ${iconConfig}`}>
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div>
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            {subtitle && (
              <p className="text-sm text-slate-500 font-medium">{subtitle}</p>
            )}
          </div>
        </div>
        {action && (
          <button
            onClick={onAction}
            className="flex items-center gap-1 text-sm font-medium text-green-600 hover:text-green-700 transition-colors group"
          >
            {actionLabel || 'View All'}
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}
      </div>
      {/* Content */}
      <div className="flex-1 p-6 overflow-visible min-h-0 flex flex-col">{children}</div>
    </div>
  );
};
export default AdminPanel;
