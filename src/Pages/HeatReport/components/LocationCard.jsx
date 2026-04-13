function LocationCard({ location, loggedAt }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-primary/12 bg-background-light p-4 dark:bg-background-dark/70">
      <div className="rounded-lg bg-primary/10 p-2">
        <span className="material-symbols-outlined text-primary">
          location_on
        </span>
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-soft-green">
          Current Location
        </p>
        <p className="mt-1 text-sm font-semibold text-text-dark dark:text-background-light">
          {location}
        </p>
        <p className="mt-1 flex items-center gap-1 text-xs text-soft-green">
          <span className="material-symbols-outlined text-xs">schedule</span>
          Logged: {loggedAt}
        </p>
      </div>
    </div>
  );
}

export default LocationCard;
