function ValidationProgressCard({ progress }) {
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.max(0, Math.min(100, progress));
  const dashOffset = circumference * (1 - clampedProgress / 100);

  return (
    <section className="flex flex-col items-center space-y-4 rounded-xl border border-primary/5 bg-white p-8 text-center shadow-sm dark:bg-surface-dark">
      <div className="relative size-32">
        <svg className="size-full" viewBox="0 0 128 128" aria-hidden="true">
          <circle
            className="text-primary/10"
            cx="64"
            cy="64"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
          />
          <circle
            className="text-primary transition-all duration-500"
            cx="64"
            cy="64"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold">{clampedProgress}%</span>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold tracking-tight">Validating Data...</h2>
        <p className="mt-1 text-soft-green">
          Our ML model is verifying your submission for consistency and quality.
        </p>
      </div>
    </section>
  );
}

export default ValidationProgressCard;
