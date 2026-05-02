// Centralized component exports for better modular architecture
// Layout Components
export { default as DashboardLayout } from './layout/DashboardLayout';
export { default as ContextPanel } from './layout/ContextPanel';
export { default as ContextModal } from './layout/ContextModal';
// UI Components - New Design System
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './ui/Card';
export { Button } from './ui/Button';
export { Input } from './ui/Input';
export { Container } from './ui/Container';
export { Section } from './ui/Section';
export { DashboardWidget } from './ui/DashboardWidget';
// Legacy UI Components (to be refactored)
export { default as RouteLoader } from './ui/RouteLoader';
// Dashboard Components
export { default as KpiCards } from './dashboard/KpiCards';
export { default as MapSection } from './dashboard/MapSection';
export { default as AnalyticsSection } from './dashboard/AnalyticsSection';
// Auth Components
export { default as ProtectedRoute } from './auth/ProtectedRoute';
