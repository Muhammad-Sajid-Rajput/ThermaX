function PipelineFlowCard({ steps, submissionId, timestamp }) {
  const activeStepIndex = Math.max(
    0,
    steps.findIndex((step) => step.state === "active"),
  );

  const progressWidth =
    steps.length > 0 ? (activeStepIndex / steps.length) * 100 : 0;

  return (
    <section className="rounded-xl bg-white p-6 shadow-sm dark:bg-surface-dark">
      <h3 className="mb-8 text-center text-xs font-bold uppercase tracking-[0.2em] text-soft-green">
        Data Pipeline Flow
      </h3>

      <div className="flex items-center justify-between relative px-4">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-primary/20 -translate-y-1/2 z-0" />
        <div
          className="absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 z-0 transition-all duration-500"
          style={{ width: `${progressWidth}%` }}
        />

        {steps.map((step) => {
          const isComplete = step.state === "complete";
          const isActive = step.state === "active";

          return (
            <div
              key={step.label}
              className="relative z-10 flex flex-col items-center gap-2"
            >
              <div
                className={`size-12 rounded-full flex items-center justify-center shadow-lg ${
                  isComplete
                    ? "bg-primary shadow-primary/20"
                    : isActive
                      ? "border-2 border-primary bg-white dark:bg-surface-dark"
                      : "border-2 border-primary/30 bg-white dark:bg-surface-dark"
                }`}
              >
                <span
                  className={`material-symbols-outlined ${isComplete ? "text-text-dark" : isActive ? "text-primary" : "text-soft-green"}`}
                >
                  {step.icon}
                </span>
              </div>
              <span
                className={`text-xs font-bold ${isActive ? "opacity-60" : ""}`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-8 pt-6 border-t border-primary/5 grid grid-cols-2 gap-4">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase text-soft-green/80">
            Submission ID
          </span>
          <span className="text-sm font-mono">{submissionId}</span>
        </div>

        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase text-soft-green/80">
            Timestamp
          </span>
          <span className="text-sm">{timestamp}</span>
        </div>
      </div>
    </section>
  );
}

export default PipelineFlowCard;
