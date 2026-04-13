import { Link, useLocation } from "react-router-dom";
import Header from "../../Components/Header";

function PermissionDeniedPage() {
  const { state } = useLocation();
  const reason = state?.reason || "Location permission denied.";

  return (
    <div className="flex min-h-screen flex-col bg-background-light font-display text-text-dark dark:bg-background-dark dark:text-background-light">
      <Header />

      
      <main className="flex flex-1 items-center justify-center p-6">
        <section className="w-full max-w-xl rounded-2xl border border-heatmap-high/20 bg-white p-8 text-center shadow-xl dark:bg-surface-dark">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-heatmap-high/10">
            <span className="material-symbols-outlined text-4xl text-heatmap-high">
              location_off
            </span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight">Location Access Denied</h1>
          <p className="mt-3 text-sm leading-relaxed text-soft-green">
            We could not access your location, so heat reporting is blocked for now.
            Allow location permission to continue.
          </p>
          <p className="mt-2 text-xs text-soft-green/80">Reason: {reason}</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/permission"
              className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-text-dark"
            >
              Try Again
            </Link>
            <Link
              to="/"
              className="flex-1 rounded-xl border border-primary/30 px-4 py-3 text-sm font-bold text-text-dark dark:text-background-light"
            >
              Return Home
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

export default PermissionDeniedPage;
