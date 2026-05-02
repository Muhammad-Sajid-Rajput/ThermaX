import React from 'react';
import { cn } from '../../utils/cn';
const Section = React.forwardRef(
  ({ className, children, padding = 'default', ...props }, ref) => {
    const paddingClasses = {
      none: '',
      sm: 'py-8',
      default: 'py-12',
      lg: 'py-16',
      xl: 'py-20',
    };
    return (
      <section
        ref={ref}
        className={cn(paddingClasses[padding], className)}
        {...props}
      >
        {children}
      </section>
    );
  }
);
Section.displayName = 'Section';
export { Section };
