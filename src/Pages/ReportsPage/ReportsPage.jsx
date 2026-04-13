import Footer from "../../Components/Footer.jsx";
import Header from "../../Components/Header.jsx";
import { Link } from "react-router-dom";
import {
  LAST_REPORT_LABEL,
  REPORT_EXPORT_OPTIONS,
  REPORT_PREVIEW_BARS,
  REPORT_STATS,
} from "./constants.js";
import ReportExportOptions from "./components/ReportExportOptions.jsx";
import ReportPreviewCard from "./components/ReportPreviewCard.jsx";
import ReportsSummaryStats from "./components/ReportsSummaryStats.jsx";
import ReportStatusIndicator from "./components/ReportStatusIndicator.jsx";

function ReportsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background-light font-display text-[#0d1b10] dark:bg-background-dark dark:text-white">
      <Header />

      <div className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
        <div className="flex justify-start">
          <Link
            to="/dashboard"
            className="inline-flex h-10 items-center rounded-lg bg-primary px-3 text-xs font-semibold text-text-dark shadow-sm shadow-primary/20 transition-opacity hover:opacity-90"
            aria-label="Back to Dashboard"
            title="Back to Dashboard"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
        </div>
      </div>

      <main className="flex-1 pb-8">
        <section className="px-4 pt-4">
          <h1 className="text-2xl font-bold leading-tight tracking-tight">
            Official Mitigation Reports
          </h1>
        </section>

        <ReportsSummaryStats stats={REPORT_STATS} />
        <ReportPreviewCard bars={REPORT_PREVIEW_BARS} />
        <ReportExportOptions options={REPORT_EXPORT_OPTIONS} />
        <ReportStatusIndicator label={LAST_REPORT_LABEL} />
      </main>

      <Footer />
    </div>
  );
}

export default ReportsPage;
