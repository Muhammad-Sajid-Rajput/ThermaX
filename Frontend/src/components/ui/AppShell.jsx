import { Container } from '../Container.jsx';
import { Section } from '../Section.jsx';
const AppShell = ({
  children,
  title,
  description,
  eyebrow,
  className = '',
  ...props
}) => {
  return (
    <div className={className} {...props}>
      <Container>
        <Section padding="default">
          {/* Header */}
          <div className="mb-8">
            {eyebrow && (
              <p className="text-sm font-medium text-green-600 uppercase tracking-wide mb-2">
                {eyebrow}
              </p>
            )}
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{title}</h1>
            {description && (
              <p className="text-lg text-gray-600 max-w-3xl">{description}</p>
            )}
          </div>
          {/* Content */}
          <div>{children}</div>
        </Section>
      </Container>
    </div>
  );
};
export default AppShell;
