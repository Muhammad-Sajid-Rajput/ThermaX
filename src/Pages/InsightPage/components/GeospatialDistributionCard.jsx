function GeospatialDistributionCard() {
  return (
    <section className="px-4 py-4">
      <div className="relative overflow-hidden rounded-xl border border-primary/10 bg-white shadow-sm dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <span className="material-symbols-outlined text-lg text-primary">
              layers
            </span>
            Geospatial Distribution
          </h2>
          <span className="font-mono text-[10px] text-slate-500">
            LAYER_01_HEATMAP
          </span>
        </div>

        <div className="relative aspect-video w-full bg-slate-200 dark:bg-slate-800">
          <img
            alt="Satellite map of a city showing data heat clusters"
            className="h-full w-full object-cover grayscale opacity-50"
            data-location="Metropolitan Area"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuA0fy7huQLd_HTZBg2UX6xGNbZ7QN8t6aJUt9wtKooQZ7NM60YDM9uRRrZ2iNJ7m8z2MrTu8urVMpiNTa4cnRH3psdfKwGrzWfvzXL_rlefdu-D8gDGeI5gBVDClcBhNwRUBoxWSV6JOWuvDRLeETAKU6nSphheXZRRZXUiIN6zypd8G5svf6z2o-bM3j23tg5ZI5OXmB-0MZIx0IWpsXzJQpeisw_OnepOFHDEAEV81fORZCEvUbVIyYJadSeTI2InzF0vTdMJ_yM"
          />
          <div className="absolute top-1/4 left-1/3 flex size-12 items-center justify-center rounded-full border border-primary bg-primary/30 animate-pulse">
            <div className="size-4 rounded-full bg-primary"></div>
          </div>
          <div className="absolute right-1/4 bottom-1/3 flex size-8 items-center justify-center rounded-full border border-primary bg-primary/30">
            <div className="size-2 rounded-full bg-primary"></div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default GeospatialDistributionCard;
