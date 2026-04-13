import { MAP_IMAGE_URL, MAP_MARKERS } from "../constants";

function MapView() {
  return (
    <section className="relative w-full overflow-hidden bg-background-light dark:bg-background-dark">
      <div
        className="relative h-[56vh] min-h-90 w-full bg-cover bg-center"
        style={{ backgroundImage: `url('${MAP_IMAGE_URL}')` }}
        aria-label="Detailed city map with heatmap overlay"
      >
        <div className="absolute inset-0 bg-linear-to-br from-primary/30 via-heatmap-mid/20 to-heatmap-high/40 opacity-70 mix-blend-multiply" />

        {MAP_MARKERS.map((marker) => (
          <div key={marker.label} className={marker.wrapperClass}>
            <div className="flex flex-col items-center">
              <div className={marker.markerClass} />
              <div className="mt-1 rounded bg-white/90 px-2 py-0.5 text-[10px] font-bold shadow-sm backdrop-blur-sm dark:bg-surface-dark/90">
                {marker.label}
              </div>
            </div>
          </div>
        ))}

        <div className="absolute bottom-6 left-4 z-10 w-48 rounded-xl border border-primary/15 bg-white/90 p-3 shadow-lg backdrop-blur-md dark:bg-surface-dark/90">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-soft-green">
            Severity Scale
          </p>
          <div
            className="mb-1 h-2 w-full rounded-full"
            style={{
              background:
                "linear-gradient(to right, var(--color-primary), var(--color-heatmap-mid), var(--color-heatmap-high))",
            }}
          />
          <div className="flex justify-between text-[10px] font-medium text-soft-green dark:text-background-light/80">
            <span>Low</span>
            <span>High</span>
          </div>
        </div>

        <div className="absolute right-4 top-4 z-10 flex flex-col gap-2">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-md dark:bg-surface-dark"
          >
            <span className="material-symbols-outlined text-text-dark dark:text-background-light">
              my_location
            </span>
          </button>

          <div className="flex flex-col divide-y divide-primary/10 rounded-xl bg-white shadow-md dark:divide-primary/20 dark:bg-surface-dark">
            <button type="button" className="flex h-10 w-10 items-center justify-center">
              <span className="material-symbols-outlined text-text-dark dark:text-background-light">
                add
              </span>
            </button>
            <button type="button" className="flex h-10 w-10 items-center justify-center">
              <span className="material-symbols-outlined text-text-dark dark:text-background-light">
                remove
              </span>
            </button>
          </div>

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-md dark:bg-surface-dark"
          >
            <span className="material-symbols-outlined text-text-dark dark:text-background-light">
              layers
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}

export default MapView;
