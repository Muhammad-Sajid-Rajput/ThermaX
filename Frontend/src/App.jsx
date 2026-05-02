import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';
import AdminLayout from './components/admin/AdminLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Pages
import LandingPage from './Pages/Landing/LandingPage';
import AuthPage from './Pages/Auth/AuthPage';
import SaaS from './Pages/Dashboard/SaaS';
import InsightPage from './Pages/Insight/InsightPage';
import HeatReportPage from './Pages/HeatReport/HeatReportPage';
import MyReportsPage from './Pages/Reports/MyReportsPage';
import ReportsPage from './Pages/Reports/ReportsPage';
import ProfilePage from './Pages/Profile/ProfilePage';
import PermissionDeniedPage from './Pages/Permission/PermissionDeniedPage';
import UnauthorizedPage from './Pages/Permission/UnauthorizedPage';
import SubmissionStatusPage from './Pages/HeatReport/SubmissionStatusPage';

// Admin Pages
import AdminDashboard from './Pages/Admin/AdminDashboard';
import UserManagement from './Pages/Admin/UserManagement';
import ReportManagement from './Pages/Admin/ReportManagement';
import HeatmapControl from './Pages/Admin/HeatmapControl';
import Analytics from './Pages/Admin/Analytics';
import AlertSystem from './Pages/Admin/AlertSystem';
import SystemSettings from './Pages/Admin/SystemSettings';

// Admin Routes Wrapper - Uses AdminLayout
function AdminRoutes() {
  return (
    <ProtectedRoute adminOnly={true}>
      <AdminLayout>
        <Routes>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="reports" element={<ReportManagement />} />
          <Route path="heatmap" element={<HeatmapControl />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="alerts" element={<AlertSystem />} />
          <Route path="settings" element={<SystemSettings />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </AdminLayout>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Admin Routes - Use AdminLayout */}
        <Route path="/admin/*" element={<AdminRoutes />} />

        {/* All Other Routes - Use AppLayout */}
        <Route
          path="/*"
          element={
            <AppLayout>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<AuthPage />} />
                <Route path="/signup" element={<AuthPage />} />

                {/* Public Dashboard Routes (no login required) */}
                <Route path="/dashboard" element={<SaaS />} />
                <Route path="/insight" element={<InsightPage />} />

                {/* Public Reports Route */}
                <Route path="/reports" element={<ReportsPage />} />

                {/* Protected Routes - Authentication Required */}
                <Route
                  path="/report"
                  element={
                    <ProtectedRoute>
                      <HeatReportPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/my-reports"
                  element={
                    <ProtectedRoute>
                      <MyReportsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/report/status"
                  element={
                    <ProtectedRoute>
                      <SubmissionStatusPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />

                {/* Unauthorized/Permission Pages */}
                <Route path="/unauthorized" element={<UnauthorizedPage />} />
                <Route
                  path="/permission/denied"
                  element={<PermissionDeniedPage />}
                />

                {/* Catch all - redirect to dashboard */}
                <Route
                  path="*"
                  element={<Navigate to="/dashboard" replace />}
                />
              </Routes>
            </AppLayout>
          }
        />
      </Routes>
    </AuthProvider>
  );
}

export default App;
