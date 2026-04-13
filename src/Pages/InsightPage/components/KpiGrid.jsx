function KpiGrid() {
  return (
    <section className="grid grid-cols-2 gap-4 px-4 py-4">
      <div className="flex flex-col items-center rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <span className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Aggregation Score
        </span>

        <div className="relative h-20 w-20">
          <svg className="-rotate-90" width="80" height="80" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="transparent"
              stroke="#f1f5f9"
              strokeWidth="8"
            ></circle>
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="transparent"
              stroke="#13ec37"
              strokeWidth="8"
              strokeDasharray="251.2"
              strokeDashoffset="62.8"
              strokeLinecap="round"
            ></circle>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold">75</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-center rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <span className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Anomaly Index
        </span>
        <div className="mb-1 text-2xl font-bold">12.4%</div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div className="h-full rounded-full bg-primary" style={{ width: "12.4%" }}></div>
        </div>
        <span className="mt-2 flex items-center gap-1 text-[10px] text-slate-500">
          <span className="material-symbols-outlined text-xs">trending_up</span>
          +0.2% vs last run
        </span>
      </div>
    </section>
  );
}

export default KpiGrid;
