import React from 'react';
import { cn } from '../../utils/cn';
import { Loader2 } from 'lucide-react';
const buttonVariants = {
  primary: 'bg-primary-600 hover:bg-primary-700 text-white shadow-button',
  secondary:
    'border border-primary-200 bg-white hover:bg-primary-50 text-primary-700',
  danger: 'bg-error hover:bg-error-600 text-white shadow-button',
  outline: 'border border-slate-300 bg-white hover:bg-slate-50 text-slate-700',
  ghost: 'hover:bg-slate-100 text-slate-700',
  link: 'text-primary-600 hover:text-primary-700 underline-offset-4 hover:underline',
};
const buttonSizes = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 py-2',
  lg: 'h-12 px-6 text-lg',
  xl: 'h-14 px-8 text-xl',
};
const Button = React.forwardRef(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
          buttonVariants[variant],
          buttonSizes[size],
          className
        )}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
export { Button };
