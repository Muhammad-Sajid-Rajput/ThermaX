import Footer from "../../Components/Footer";
import Header from "../../Components/Header";
import KpiSection from "./components/KpiSection";
import MapView from "./components/MapView";
import TopControls from "./components/TopControls";
import { Link } from "react-router-dom";

function Dashboard() {
  return (
    <div className="min-h-screen bg-background-light font-display text-text-dark antialiased dark:bg-background-dark dark:text-background-light">
      <Header />
      <div className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-start gap-2">
          <Link
            to="/insight"
            className="inline-flex h-10 items-center rounded-lg border border-primary/30 bg-primary/15 px-3 text-xs font-semibold text-text-dark transition-colors hover:bg-primary/25 dark:bg-primary/20 dark:text-background-light"
          >
            ML & HOTSPOT ANALYTICS
          </Link>
          <Link
            to="/reports"
            className="inline-flex h-10 items-center rounded-lg bg-primary px-3 text-xs font-semibold text-text-dark shadow-sm shadow-primary/20 transition-opacity hover:opacity-90"
          >
            REPORTS & EXPORT
          </Link>
        </div>
      </div>
      <main className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-2xl border border-primary/10 bg-white shadow-sm dark:bg-surface-dark">
          <TopControls />
          <MapView />
          <KpiSection />
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default Dashboard;
