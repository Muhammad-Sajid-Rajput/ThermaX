import { LOCATION_STATUS } from "../constants";

function PermissionStatusList({ locationAccess }) {
  const isGranted = locationAccess === LOCATION_STATUS.GRANTED;

  return (
    <div className="mb-8 w-full space-y-3">
      <div className="flex items-center justify-between rounded-lg border border-primary/10 bg-background-light p-3 dark:border-primary/20 dark:bg-surface-dark">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">
            check_circle
          </span>
          <span className="text-sm font-medium">GPS Signal Strength</span>
        </div>
        <span className="rounded bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
          EXCELLENT
        </span>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-primary/10 bg-background-light p-3 dark:border-primary/20 dark:bg-surface-dark">
        <div className="flex items-center gap-3">
          <span
            className={`material-symbols-outlined ${isGranted ? "text-primary" : "text-heatmap-high"}`}
          >
            {isGranted ? "check_circle" : "cancel"}
          </span>
          <span className="text-sm font-medium">Location Access</span>
        </div>
        <span
          className={`rounded px-2 py-1 text-xs font-bold uppercase ${
            isGranted
              ? "bg-primary/10 text-primary"
              : "bg-heatmap-high/10 text-heatmap-high"
          }`}
        >
          {locationAccess}
        </span>
      </div>
    </div>
  );
}

export default PermissionStatusList;
