import { Link } from "react-router-dom";

function StatusBottomActions() {
  return (
    <section className="flex gap-3 border-t border-primary/10 bg-white p-4 dark:bg-surface-dark">
      <Link
        to="/"
        className="flex-1 rounded-xl border border-primary py-3 text-center font-bold text-text-dark transition-colors hover:bg-primary/5 dark:text-primary"
      >
        Return to Home
      </Link>

      <Link
        to="/dashboard"
        className="flex-1 rounded-xl bg-primary py-3 text-center font-bold text-text-dark shadow-lg shadow-primary/20"
      >
        View Dashboard
      </Link>
    </section>
  );
}

export default StatusBottomActions;
