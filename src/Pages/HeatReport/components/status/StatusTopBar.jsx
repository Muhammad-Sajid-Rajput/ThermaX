import { Link } from "react-router-dom";

function StatusTopBar() {
  return (
    <nav className="flex items-center justify-between border-b border-primary/10 bg-white p-4 dark:bg-surface-dark">
      <div className="flex items-center gap-2">
        <Link
          to="/report"
          className="inline-flex h-10 items-center rounded-lg bg-primary px-3 text-xs font-semibold text-text-dark shadow-sm shadow-primary/20 transition-opacity hover:opacity-90"
          aria-label="Back to heat report form"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <span className="font-semibold text-lg">Submission Status</span>
      </div>
    </nav>
  );
}

export default StatusTopBar;
