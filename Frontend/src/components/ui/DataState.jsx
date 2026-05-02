import { AlertCircle, RefreshCw, Inbox } from 'lucide-react';
import { Button } from './Button';
const ErrorState = ({
  message = 'Something went wrong',
  onRetry,
  className = '',
  ...props
}) => {
  return (
    <div className={`py-12 text-center ${className}`} {...props}>
      <AlertCircle className="h-12 w-12 text-red-400 mb-4 mx-auto" />
      <h3 className="text-lg font-medium text-slate-900 mb-2">Error</h3>
      <p className="text-slate-600 mb-4">{message}</p>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      )}
    </div>
  );
};
const SkeletonBlocks = ({
  count = 3,
  variant = 'default',
  className = '',
  ...props
}) => {
  if (variant === 'map') {
    return (
      <div className={`animate-pulse ${className}`} {...props}>
        <div className="w-full h-[420px] bg-slate-200 rounded-xl" />
      </div>
    );
  }
  return (
    <div className={`space-y-4 ${className}`} {...props}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="animate-pulse">
          <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-slate-200 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  );
};
const LoadingState = ({ message = 'Loading...', className = '', ...props }) => {
  return (
    <div className={`py-12 text-center ${className}`} {...props}>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mb-4 mx-auto"></div>
      <p className="text-slate-600">{message}</p>
    </div>
  );
};
const EmptyState = ({
  message = 'No data available',
  icon: Icon = Inbox,
  cta,
  className = '',
  ...props
}) => {
  return (
    <div className={`py-12 text-center ${className}`} {...props}>
      <Icon className="h-12 w-12 text-slate-400 mb-4 mx-auto" />
      <h3 className="text-lg font-medium text-slate-900 mb-2">No data</h3>
      <p className="text-slate-600 mb-4">{message}</p>
      {cta}
    </div>
  );
};
export { ErrorState, SkeletonBlocks, LoadingState, EmptyState };
