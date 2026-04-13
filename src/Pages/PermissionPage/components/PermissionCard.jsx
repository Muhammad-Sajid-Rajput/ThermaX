import { PERMISSION_PREVIEW_IMAGE } from "../constants";
import PermissionStatusList from "./PermissionStatusList";

function PermissionCard({
  locationAccess,
  onRequestLocation,
  onSelectLocationManually,
}) {
  return (
    <div className="w-full max-w-md overflow-hidden rounded-xl border border-primary/5 bg-white shadow-xl dark:bg-surface-dark">
      <div className="group relative h-48 w-full overflow-hidden bg-primary/10">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-80 transition-transform duration-700 group-hover:scale-105"
          style={{ backgroundImage: `url("${PERMISSION_PREVIEW_IMAGE}")` }}
        />
        <div className="absolute inset-0 bg-linear-to-t from-white to-transparent dark:from-surface-dark" />
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-primary p-3 text-text-dark shadow-lg">
          <span className="material-symbols-outlined text-3xl">location_on</span>
        </div>
      </div>

      <div className="flex flex-col items-center p-8 text-center">
        <h1 className="mb-3 text-2xl font-bold text-text-dark dark:text-background-light">
          Enable Precise Reporting
        </h1>
        <p className="mb-8 text-base leading-relaxed text-soft-green">
          To accurately report heat hazards and help your community, we need to
          know where you are. This ensures emergency services and local teams
          can respond effectively.
        </p>

        <PermissionStatusList locationAccess={locationAccess} />

        <button
          type="button"
          className="mb-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-text-dark shadow-sm shadow-primary/20 transition-opacity hover:opacity-90"
          onClick={onRequestLocation}
        >
          <span className="material-symbols-outlined">my_location</span>
          Enable Location
        </button>

        <button
          type="button"
          className="text-sm font-medium text-soft-green underline underline-offset-4 transition-colors hover:text-primary"
          onClick={onSelectLocationManually}
        >
          Select Location Manually
        </button>
      </div>
    </div>
  );
}

export default PermissionCard;
