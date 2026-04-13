function CausesSection({ causeOptions, causes, onToggleCause }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-bold sm:text-lg">
        What&apos;s contributing to the heat?
      </h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {causeOptions.map(([key, label]) => (
          <label
            key={key}
            className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
              causes[key]
                ? "border-primary/40 bg-primary/10"
                : "border-primary/12 bg-background-light hover:bg-primary/5 dark:bg-background-dark dark:hover:bg-primary/10"
            }`}
          >
            <input
              type="checkbox"
              checked={causes[key]}
              onChange={() => onToggleCause(key)}
              className="accent-primary"
            />
            <span className="text-sm font-semibold">{label}</span>
          </label>
        ))}
      </div>
    </section>
  );
}

export default CausesSection;
