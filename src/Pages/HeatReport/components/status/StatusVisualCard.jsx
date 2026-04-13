function StatusVisualCard() {
  return (
    <section className="rounded-xl overflow-hidden border border-primary/10 aspect-video relative group cursor-pointer">
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
        style={{
          backgroundImage:
            "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCU4dVj1svANqHUPSKg1BdTMXmBUIptWIvYkge4IzH6Hqbb92inBGBxAnkc6-Tly7NBSNlOqZQ_zxYcc10L3IMbtm-EOwwK5qpFZL0b18IWwnKcfY6Bxf4GmzCImZL6daLZR8fFTo9udbkCoiAkHi1fjUz33_XZPab3FNlye0VLgccaAlBGWB-6vh1uhBHQbetgxRg_Hb5MNlvlgm8TbCOdbdDVUPsvQG0zcTTOzwOpODoo62X5uU4N068O-GMe9OmCUiRqyn7R6PU')",
        }}
      />
      <div className="absolute inset-0 flex items-end bg-linear-to-t from-background-dark/70 to-transparent p-4">
        <p className="text-sm font-medium text-background-light">
          Visualization of the analyzed data cluster and identified patterns.
        </p>
      </div>
    </section>
  );
}

export default StatusVisualCard;
