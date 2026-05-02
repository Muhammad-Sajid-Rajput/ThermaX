import React from 'react';
import { cn } from '../../utils/cn';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from './Card';
const DashboardWidget = React.forwardRef(
  (
    { className, title, description, children, size = 'default', ...props },
    ref
  ) => {
    const sizeClasses = {
      sm: 'h-48',
      default: 'h-64',
      lg: 'h-80',
      xl: 'h-96',
      full: 'h-full',
    };
    return (
      <Card
        ref={ref}
        className={cn('h-full', sizeClasses[size], className)}
        {...props}
      >
        {(title || description) && (
          <CardHeader>
            {title && <CardTitle>{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
        )}
        <CardContent className="h-full overflow-hidden">{children}</CardContent>
      </Card>
    );
  }
);
DashboardWidget.displayName = 'DashboardWidget';
export { DashboardWidget };
