import { clsx } from 'clsx';
const Panel = ({
  children,
  className = '',
  variant = 'default',
  padding = 'lg',
  ...props
}) => {
  const baseClasses = 'rounded-2xl transition-shadow';
  const variants = {
    default: 'bg-white border border-slate-200 shadow-sm',
    muted: 'bg-slate-50 border border-slate-100',
    elevated: 'bg-white border border-slate-200 shadow-md',
  };
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
    xl: 'p-8',
  };
  const classes = clsx(
    baseClasses,
    variants[variant],
    paddings[padding],
    className
  );
  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};
export default Panel;
