import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
/**
 * ProtectedRoute Component
 * Wraps routes that require authentication and/or specific role privileges.
 *
 * Props:
 * - children : The component to render if access is granted
 * - adminOnly : If true, requires ADMIN role (shorthand, default: false)
 * - allowedRoles : Array of allowed role strings, e.g. ['ADMIN']. Takes
 * precedence over adminOnly when provided.
 * - redirectTo : Path to redirect to if not authenticated (default:'/login')
 * - unauthorizedTo : Path to redirect to if not authorized (default:'/unauthorized')
 */
function ProtectedRoute({
  children,
  adminOnly = false,
  allowedRoles = null,
  redirectTo = '/login',
  unauthorizedTo = '/unauthorized',
}) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();
  // Show spinner while checking authentication state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }
  // Not authenticated → redirect to login with return URL
  if (!isAuthenticated) {
    return (
      <Navigate to={redirectTo} state={{ from: location.pathname }} replace />
    );
  }
  // Determine the effective allowed-role list:
  // - allowedRoles array takes precedence if provided
  // - fall back to adminOnly flag (treats ADMIN as sole allowed role)
  const effectiveRoles = allowedRoles ?? (adminOnly ? ['ADMIN'] : null);
  // If a role restriction exists, enforce it
  if (effectiveRoles && !effectiveRoles.includes(user?.role)) {
    return <Navigate to={unauthorizedTo} replace />;
  }
  // All checks passed — render the protected content
  return children;
}
export default ProtectedRoute;
