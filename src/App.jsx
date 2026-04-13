import { Navigate, Route, Routes } from "react-router-dom";
import LandingPage from "./Pages/LandingPage/LandingPage.jsx";
import HeatReportForm from "./Pages/HeatReport/HeatReportForm.jsx";
import Dashboard from "./Pages/Dashboard/Dashboard.jsx";
import SubmissionStatus from "./Pages/HeatReport/SubmissionStatus.jsx";
import PermissionPage from "./Pages/PermissionPage/PermissionPage.jsx";
import PermissionDeniedPage from "./Pages/PermissionPage/PermissionDeniedPage.jsx";
import InsightPage from "./Pages/InsightPage/InsightPage.jsx";
import ReportsPage from "./Pages/ReportsPage/ReportsPage.jsx";

const REPORT_PERMISSION_KEY = "thermax-location-permission";

function ProtectedReportRoute({ children }) {
  const hasPermission =
    typeof window !== "undefined" &&
    window.sessionStorage.getItem(REPORT_PERMISSION_KEY) === "granted";

  if (!hasPermission) {
    return <Navigate to="/permission" replace />;
  }

  return children;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/permission" element={<PermissionPage />} />
      <Route path="/permission/denied" element={<PermissionDeniedPage />} />
      <Route
        path="/report"
        element={
          <ProtectedReportRoute>
            <HeatReportForm />
          </ProtectedReportRoute>
        }
      />
      <Route
        path="/report/status"
        element={
          <ProtectedReportRoute>
            <SubmissionStatus />
          </ProtectedReportRoute>
        }
      />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/insight" element={<InsightPage />} />
      <Route path="/reports" element={<ReportsPage />} />
    </Routes>
  );
}

export default App;
