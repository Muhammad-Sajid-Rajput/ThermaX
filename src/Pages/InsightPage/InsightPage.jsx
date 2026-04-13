import GeospatialDistributionCard from "./components/GeospatialDistributionCard.jsx";
import HeatClusterRanking from "./components/HeatClusterRanking.jsx";
import InferenceSummary from "./components/InferenceSummary.jsx";
import InsightCharts from "./components/InsightCharts.jsx";
import KpiGrid from "./components/KpiGrid.jsx";
import { Link } from "react-router-dom";
import Header from "../../Components/Header.jsx";
import Footer from "../../Components/Footer.jsx";

function InsightPage() {
  return (
    <div className="font-display min-h-screen bg-background-light text-slate-900 dark:bg-background-dark dark:text-slate-100">
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

      <main className="pb-8">
        <section className="px-4 pt-4">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            ML Analytics Layer
          </h1>
        </section>
        <InferenceSummary />
        <GeospatialDistributionCard />
        <KpiGrid />
        <HeatClusterRanking />
        <InsightCharts />
      </main>

      <Footer />
    </div>
  );
}

export default InsightPage;
