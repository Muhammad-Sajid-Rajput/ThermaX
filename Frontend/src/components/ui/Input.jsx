import React from 'react';
import { cn } from '../../utils/cn';
const inputVariants = {
  default:
    'border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
  error:
    'border-error bg-error-50 text-error-900 placeholder-error-400 focus:border-error-500 focus:ring-2 focus:ring-error-500/20',
  success:
    'border-success bg-success-50 text-success-900 placeholder-success-400 focus:border-success-500 focus:ring-2 focus:ring-success-500/20',
};
const inputSizes = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-3 py-2',
  lg: 'h-12 px-4 py-3 text-lg',
};
const Input = React.forwardRef(
  ({ className, variant = 'default', size = 'md', error, ...props }, ref) => {
    const variantClass = error ? 'error' : variant;
    return (
      <input
        className={cn(
          'flex w-full rounded-lg shadow-sm transition-all duration-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
          inputVariants[variantClass],
          inputSizes[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';
export { Input };
