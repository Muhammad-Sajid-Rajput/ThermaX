function InsightHeader() {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-primary/10 bg-white/80 p-4 backdrop-blur-md dark:bg-background-dark/80">
      <button
        type="button"
        aria-label="Go back"
        className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-slate-900 dark:text-white"
      >
        <span className="material-symbols-outlined">arrow_back</span>
      </button>

      <div className="flex flex-col items-center">
        <h2 className="text-lg font-bold leading-tight tracking-tight text-slate-900 dark:text-white">
          ML Analytics Layer
        </h2>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          System Status: Optimal
        </p>
      </div>

      <div className="flex w-10 items-center justify-end">
        <button
          type="button"
          aria-label="View run history"
          className="flex size-10 cursor-pointer items-center justify-center rounded-lg bg-primary text-white shadow-lg shadow-primary/20"
        >
          <span className="material-symbols-outlined">history</span>
        </button>
      </div>
    </header>
  );
}

export default InsightHeader;
