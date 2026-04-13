import { DASHBOARD_TITLE } from "../constants";

function TopControls() {
  return (
    <header className="z-20 flex flex-col gap-3 border-b border-primary/10 bg-white/80 p-4 backdrop-blur-md dark:bg-background-dark/80">
      <div className="flex items-center">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-3xl text-primary">analytics</span>
          <h1 className="text-xl font-bold tracking-tight">{DASHBOARD_TITLE}</h1>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex h-9 shrink-0 items-center rounded-lg border border-primary/10 bg-primary/5 p-1">
          <button
            type="button"
            className="flex h-full items-center rounded-md bg-white px-3 text-xs font-semibold text-primary shadow-sm dark:bg-surface-dark"
          >
            Crowd
          </button>
          <button
            type="button"
            className="flex h-full items-center rounded-md px-3 text-xs font-semibold text-soft-green"
          >
            Satellite
          </button>
        </div>

        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            className="flex h-9 items-center gap-1 rounded-lg border border-primary/15 bg-white px-3 text-xs font-medium dark:border-primary/20 dark:bg-surface-dark"
          >
            Today <span className="material-symbols-outlined text-sm">expand_more</span>
          </button>
          <button
            type="button"
            className="flex h-9 items-center gap-1 rounded-lg border border-primary/15 bg-white px-3 text-xs font-medium dark:border-primary/20 dark:bg-surface-dark"
          >
            Severity <span className="material-symbols-outlined text-sm">tune</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export default TopControls;
