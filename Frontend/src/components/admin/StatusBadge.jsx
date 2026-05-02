const StatusBadge = ({
  status,
  size = 'md', //'sm','md','lg'
  pulse = false,
}) => {
  const statusConfigs = {
    // System status
    operational: {
      bg: 'bg-emerald-100',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      dot: 'bg-emerald-500',
      label: 'Operational',
    },
    warning: {
      bg: 'bg-amber-100',
      border: 'border-amber-200',
      text: 'text-amber-700',
      dot: 'bg-amber-500',
      label: 'Warning',
    },
    critical: {
      bg: 'bg-red-100',
      border: 'border-red-200',
      text: 'text-red-700',
      dot: 'bg-red-500',
      label: 'Critical',
    },
    // User status
    active: {
      bg: 'bg-emerald-100',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      dot: 'bg-emerald-500',
      label: 'Active',
    },
    suspended: {
      bg: 'bg-red-100',
      border: 'border-red-200',
      text: 'text-red-700',
      dot: 'bg-red-500',
      label: 'Suspended',
    },
    inactive: {
      bg: 'bg-slate-100',
      border: 'border-slate-200',
      text: 'text-slate-600',
      dot: 'bg-slate-400',
      label: 'Inactive',
    },
    // Report status
    pending: {
      bg: 'bg-amber-100',
      border: 'border-amber-200',
      text: 'text-amber-700',
      dot: 'bg-amber-500',
      label: 'Pending',
    },
    validated: {
      bg: 'bg-emerald-100',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      dot: 'bg-emerald-500',
      label: 'Validated',
    },
    rejected: {
      bg: 'bg-red-100',
      border: 'border-red-200',
      text: 'text-red-700',
      dot: 'bg-red-500',
      label: 'Rejected',
    },
    duplicate: {
      bg: 'bg-green-100',
      border: 'border-green-200',
      text: 'text-green-700',
      dot: 'bg-green-500',
      label: 'Duplicate',
    },
    // Severity
    critical_severity: {
      bg: 'bg-red-100',
      border: 'border-red-200',
      text: 'text-red-700',
      dot: 'bg-red-500',
      label: 'Critical',
    },
    high: {
      bg: 'bg-orange-100',
      border: 'border-orange-200',
      text: 'text-orange-700',
      dot: 'bg-orange-500',
      label: 'High',
    },
    moderate: {
      bg: 'bg-amber-100',
      border: 'border-amber-200',
      text: 'text-amber-700',
      dot: 'bg-amber-500',
      label: 'Moderate',
    },
    low: {
      bg: 'bg-green-100',
      border: 'border-green-200',
      text: 'text-green-700',
      dot: 'bg-green-500',
      label: 'Low',
    },
  };
  const config = statusConfigs[status.toLowerCase()] || statusConfigs.inactive;
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };
  return (
    <span
      className={`
inline-flex items-center gap-1.5 rounded-full border font-medium
${config.bg} ${config.border} ${config.text}
${sizeClasses[size]}`}
    >
      <span
        className={`
w-1.5 h-1.5 rounded-full ${config.dot}
${pulse ? 'animate-pulse' : ''}`}
      ></span>
      {config.label}
    </span>
  );
};
export default StatusBadge;
