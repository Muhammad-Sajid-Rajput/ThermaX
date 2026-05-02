import { clsx } from 'clsx';
const SectionHeading = ({
  title,
  subtitle,
  className = '',
  size = 'md',
  ...props
}) => {
  const baseClasses = 'font-semibold text-gray-900';
  const sizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };
  const titleClasses = clsx(baseClasses, sizes[size]);
  return (
    <div className={className} {...props}>
      <h2 className={titleClasses}>{title}</h2>
      {subtitle && <p className="text-gray-600 mt-1 text-sm">{subtitle}</p>}
    </div>
  );
};
export default SectionHeading;
