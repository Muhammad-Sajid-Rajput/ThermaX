function HeroPreviewCard({ imageUrl, focusLabel, tempLabel, deltaLabel }) {
  return (
    <div className="relative lg:ml-10">
      <div className="absolute -inset-4 rounded-3xl bg-primary/10 blur-2xl" />
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-white shadow-2xl shadow-primary/10 dark:bg-background-dark">
        <div
          className="h-100 w-full bg-cover bg-center"
          style={{ backgroundImage: `url("${imageUrl}")` }}
          data-alt="Stylized urban heat map overlay with hotspots"
        >
          <div className="absolute inset-0 bg-linear-to-t from-background-dark/20 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6 rounded-xl bg-white/90 p-4 shadow-xl backdrop-blur-sm dark:bg-background-dark/90">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/20">
                  <span className="material-symbols-outlined text-primary">
                    location_on
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-soft-green">
                    Current Focus
                  </p>
                  <p className="text-sm font-bold text-text-dark dark:text-background-light">
                    {focusLabel}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-text-dark dark:text-background-light">
                  {tempLabel}
                </p>
                <p className="text-[10px] font-medium text-soft-green">
                  {deltaLabel}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HeroPreviewCard;
