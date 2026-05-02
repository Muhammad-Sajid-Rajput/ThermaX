import { clsx } from 'clsx';
/**
 * Badge component with heat severity and status variants.
 *
 * Heat Severity Scale:
 * - safe: Green (S1-S2, low heat)
 * - moderate: Yellow/Amber (S3, moderate heat)
 * - high: Orange (S4, high heat)
 * - critical: Red (S5, extreme heat)
 *
 * Status Variants:
 * - default: Blue for general info
 * - success: Green for validated/approved
 * - warning: Yellow for pending/review
 * - error: Red for rejected/critical
 * - info: Indigo for neutral info
 * - gray: Gray for muted states
 */
const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center font-medium rounded-full';
  const variants = {
    // Status variants
    default: 'bg-green-100 text-green-800',
    success: 'bg-emerald-100 text-emerald-800',
    warning: 'bg-amber-100 text-amber-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-indigo-100 text-indigo-800',
    gray: 'bg-slate-100 text-slate-800',
    // Heat severity variants
    safe: 'bg-emerald-100 text-emerald-800',
    moderate: 'bg-amber-100 text-amber-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
  };
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };
  const classes = clsx(baseClasses, variants[variant], sizes[size], className);
  return (
    <span className={classes} {...props}>
      {children}
    </span>
  );
};
export default Badge;
