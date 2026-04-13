function FeatureCard({ icon, title, description }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-primary/10 bg-white p-8 shadow-sm transition-all hover:shadow-md dark:bg-background-dark">
      <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <h3 className="text-xl font-bold text-text-dark dark:text-background-light">
        {title}
      </h3>
      <p className="text-sm leading-relaxed text-soft-green">{description}</p>
    </div>
  );
}

export default FeatureCard;
