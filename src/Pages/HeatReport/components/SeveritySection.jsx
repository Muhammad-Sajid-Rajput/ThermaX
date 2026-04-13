function SeveritySection({ severity, severityLabels, onSeverityChange }) {
  const severityPercent = ((severity - 1) / 4) * 100;

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-base font-bold sm:text-lg">
          How intense is the heat?
        </h2>
        <div className="text-right leading-tight">
          <p className="text-2xl font-black text-heatmap-mid">{severity}</p>
          <p className="text-xs font-semibold uppercase tracking-wider text-heatmap-mid">
            {severityLabels[severity - 1]}
          </p>
        </div>
      </div>

      <div className="space-y-5 rounded-xl border border-primary/20 bg-primary/5 p-4 dark:border-primary/25 dark:bg-primary/10">
        <div className="relative h-6 w-full">
          <div
            className="absolute top-1/2 h-2 w-full -translate-y-1/2 rounded-full"
            style={{
              background:
                "linear-gradient(to right, var(--color-primary), var(--color-heatmap-mid), var(--color-heatmap-high))",
            }}
          />
          <div
            className="absolute top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-heatmap-mid bg-background-light shadow-lg"
            style={{ left: `${severityPercent}%` }}
          />
          <input
            type="range"
            min="1"
            max="5"
            value={severity}
            onChange={(event) => onSeverityChange(Number(event.target.value))}
            className="absolute inset-0 w-full cursor-pointer opacity-0"
            aria-label="Heat severity"
          />
        </div>

        <div className="flex justify-between text-[11px] font-bold uppercase tracking-tight text-soft-green">
          {severityLabels.map((label, index) => {
            const level = index + 1;
            return (
              <span
                key={label}
                className={
                  level === severity ? "text-heatmap-mid" : ""
                }
              >
                {level}. {label}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default SeveritySection;
