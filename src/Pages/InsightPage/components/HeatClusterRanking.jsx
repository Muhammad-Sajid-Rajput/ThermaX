import { HEAT_CLUSTERS } from "../constants.js";

function HeatClusterRanking() {
  return (
    <section className="px-4 py-4">
      <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <span className="material-symbols-outlined text-lg text-primary">
              format_list_numbered
            </span>
            Heat Cluster Ranking
          </h3>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {HEAT_CLUSTERS.map((cluster) => (
            <div key={cluster.rank} className="flex items-center gap-4 p-4">
              <div
                className={`flex size-8 items-center justify-center rounded bg-slate-50 font-mono font-bold dark:bg-slate-800 ${
                  cluster.isPrimary ? "text-primary" : "text-slate-400"
                }`}
              >
                {cluster.rank}
              </div>

              <div className="flex-1">
                <p className="text-sm leading-none font-bold">{cluster.location}</p>
                <p className="mt-1 font-mono text-[10px] text-slate-500">
                  {cluster.coordinates}
                </p>
              </div>

              <div className="text-right">
                <div
                  className={`text-xs font-bold ${
                    cluster.isPrimary ? "text-primary" : "text-slate-600"
                  }`}
                >
                  {cluster.severityLabel}
                </div>
                <div className="mt-1 h-1 w-12 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full bg-primary"
                    style={{ width: cluster.severityWidth }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="w-full border-t border-slate-100 bg-slate-50 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:border-slate-800 dark:bg-slate-800/50"
        >
          View Full Dataset (24 Clusters)
        </button>
      </div>
    </section>
  );
}

export default HeatClusterRanking;
