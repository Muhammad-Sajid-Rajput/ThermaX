import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
/**
 * Admin Layout - Urban Heat Command Center
 * * Structure:
 * ┌──────────┬─────────────────────────────────────────┐
 * │ │ Admin Header (System Status) │
 * │ Sidebar ├─────────────────────────────────────────┤
 * │(fixed) │ │
 * │ │ Main Content Area (scrollable) │
 * │ │ │
 * └──────────┴─────────────────────────────────────────┘
 */
const AdminLayout = ({ children }) => {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 print:h-auto print:min-h-0 print:overflow-visible print:block print:bg-white print:p-0 print:m-0">
      {/* Left Sidebar - Fixed */}
      <div className="no-print print:hidden">
        <AdminSidebar />
      </div>
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden print:h-auto print:min-h-0 print:overflow-visible print:block print:p-0 print:m-0">
        {/* Admin Header */}
        <div className="no-print print:hidden">
          <AdminHeader />
        </div>
        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth print:h-auto print:min-h-0 print:overflow-visible print:block print:p-0 print:m-0">
          <div className="p-6 lg:p-8 print:p-0 print:m-0">{children}</div>
        </main>
      </div>
    </div>
  );
};
export default AdminLayout;
