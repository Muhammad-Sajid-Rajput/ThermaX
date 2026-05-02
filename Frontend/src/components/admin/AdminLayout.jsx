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
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Left Sidebar - Fixed */}
      <AdminSidebar />
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Admin Header */}
        <AdminHeader />
        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth">
          <div className="p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
};
export default AdminLayout;
