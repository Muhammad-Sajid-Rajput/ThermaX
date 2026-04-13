import { DISTRICT_INTENSITY } from "../constants.js";

function InsightCharts() {
  return (
    <section className="space-y-4 px-4 py-4">
      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Reporting Trends (24h)
          </h3>
          <span className="font-mono text-xs text-primary">+14% up</span>
        </div>

        <div className="relative flex h-32 w-full items-end gap-1 pt-4">
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <path
              d="M0 80 Q 20 20, 40 50 T 80 10 L 100 30"
              fill="none"
              stroke="#13ec37"
              strokeWidth="2"
            ></path>
            <path
              d="M0 80 Q 20 20, 40 50 T 80 10 L 100 30 V 100 H 0 Z"
              fill="url(#insightTrendGradient)"
              opacity="0.1"
            ></path>
            <defs>
              <linearGradient id="insightTrendGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{ stopColor: "#13ec37", stopOpacity: 1 }}></stop>
                <stop offset="100%" style={{ stopColor: "#13ec37", stopOpacity: 0 }}></stop>
              </linearGradient>
            </defs>
          </svg>

          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between opacity-10">
            <div className="w-full border-t border-slate-900 dark:border-white"></div>
            <div className="w-full border-t border-slate-900 dark:border-white"></div>
            <div className="w-full border-t border-slate-900 dark:border-white"></div>
          </div>
        </div>

        <div className="mt-2 flex justify-between font-mono text-[8px] text-slate-400">
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>NOW</span>
        </div>
      </div>

      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-6 text-xs font-bold uppercase tracking-widest text-slate-400">
          Hotspot Intensity by District
        </h3>
        <div className="space-y-4">
          {DISTRICT_INTENSITY.map((district) => (
            <div key={district.district} className="flex items-center gap-3">
              <span className="w-16 font-mono text-[10px] text-slate-500">
                {district.district}
              </span>
              <div className="h-3 flex-1 overflow-hidden rounded-sm bg-slate-50 dark:bg-slate-800">
                <div
                  className={district.dimmed ? "h-full bg-primary/40" : "h-full bg-primary"}
                  style={{ width: district.width }}
                ></div>
              </div>
              <span className="text-[10px] font-bold">{district.score}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default InsightCharts;
