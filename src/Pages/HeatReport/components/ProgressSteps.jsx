function ProgressSteps({ steps }) {
  return (
    <div className="px-1 pt-1 sm:px-2">
      <div className="relative flex items-start justify-between">
        <div className="absolute left-0 right-0 top-4 h-0.5 -translate-y-1/2 bg-primary/15" />
        <div className="absolute left-0 top-4 h-0.5 w-2/3 -translate-y-1/2 bg-primary" />

        {steps.map((step, index) => {
          const isDone = step.state === "done";
          const isActive = step.state === "active";
          const isPending = step.state === "pending";

          return (
            <div
              key={step.label}
              className="relative z-10 flex w-16 flex-col items-center gap-1 text-center sm:w-auto"
            >
              <div
                className={`flex size-8 items-center justify-center rounded-full ring-4 ${
                  isDone || isActive
                    ? "bg-primary text-text-dark ring-background-light dark:ring-background-dark"
                    : "bg-background-light text-soft-green ring-background-light dark:bg-background-dark dark:ring-background-dark"
                } border ${
                  isPending
                    ? "border-primary/20 dark:border-primary/25"
                    : "border-primary/10"
                }`}
              >
                {isDone && (
                  <span className="material-symbols-outlined text-sm font-bold">
                    check
                  </span>
                )}
                {isActive && (
                  <div className="size-2 rounded-full bg-background-light" />
                )}
                {isPending && (
                  <span className="text-xs font-bold">{index + 1}</span>
                )}
              </div>
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider ${
                  isDone
                    ? "text-primary"
                    : isActive
                      ? "text-text-dark dark:text-background-light"
                      : "text-soft-green"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ProgressSteps;
