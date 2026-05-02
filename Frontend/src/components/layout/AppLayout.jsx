import React from 'react';
import { useLocation } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import AuthLayout from './AuthLayout';
/**
 * Main layout router that determines which layout to use based on route.
 *
 * Auth routes : /login, /signup, /auth → AuthLayout (centered, no Navbar)
 * Fullscreen : / → Raw (Landing has its own header)
 * All others : DashboardLayout → Navbar + scrollable main content
 *
 * Note: /report/status, /permission, /permission/denied now use DashboardLayout
 * so users always have navigation available after login actions.
 */
const AppLayout = ({ children }) => {
  const location = useLocation();
  // Auth routes — simple centered layout, no global Navbar
  const authRoutes = ['/login', '/signup', '/auth'];
  const isAuthRoute = authRoutes.some((route) =>
    location.pathname.startsWith(route)
  );
  // Landing page only — has its own standalone inline header
  const isLandingPage = location.pathname === '/';
  if (isAuthRoute) {
    return <AuthLayout>{children}</AuthLayout>;
  }
  if (isLandingPage) {
    return <>{children}</>;
  }
  // All other routes: DashboardLayout (Navbar + padded main content)
  // Includes: /dashboard, /insight, /reports, /report, /my-reports,
  // /admin/*, /report/status, /permission/*, /unauthorized
  return <DashboardLayout>{children}</DashboardLayout>;
};
export default AppLayout;
