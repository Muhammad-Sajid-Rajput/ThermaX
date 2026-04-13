import { Link } from "react-router-dom";

function OutcomeCard({ outcome }) {
  return (
    <article
      className={`flex items-start gap-4 rounded-xl border-l-4 bg-white p-4 shadow-sm dark:bg-surface-dark ${outcome.borderClass}`}
    >
      <div className={`rounded-full p-2 ${outcome.iconWrapClass}`}>
        <span className={`material-symbols-outlined text-3xl ${outcome.iconClass}`}>
          {outcome.icon}
        </span>
      </div>

      <div className="flex-1">
        <h3 className="font-bold text-lg">{outcome.title}</h3>
        <p className="text-sm text-soft-green">{outcome.description}</p>

        {outcome.showDashboardLink ? (
          <div className="mt-3 flex gap-2">
            <Link
              to="/dashboard"
              className="inline-flex h-10 items-center rounded-lg bg-primary px-3 text-xs font-semibold text-text-dark shadow-sm shadow-primary/20 transition-opacity hover:opacity-90"
            >
              View Dashboard
            </Link>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function ValidationOutcomes({ outcomes }) {
  return (
    <div className="space-y-4">
      <p className="px-1 text-sm font-semibold uppercase tracking-wider text-soft-green">
        Validation Outcomes
      </p>
      <div className="space-y-4">
        {outcomes.map((outcome) => (
          <OutcomeCard key={outcome.title} outcome={outcome} />
        ))}
      </div>
    </div>
  );
}

export default ValidationOutcomes;
