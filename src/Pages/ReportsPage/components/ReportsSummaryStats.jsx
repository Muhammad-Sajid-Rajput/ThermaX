function ReportsSummaryStats({ stats }) {
  return (
    <section className="grid grid-cols-2 gap-4 p-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex flex-col gap-2 rounded-xl border border-[#cfe7d3] bg-white p-4 shadow-sm dark:border-[#2a442f] dark:bg-[#1a2e1d]"
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xl text-primary">
              {stat.icon}
            </span>
            <p className="text-sm font-medium text-[#4c9a59] dark:text-primary/70">
              {stat.label}
            </p>
          </div>

          <div className="mt-1 flex items-baseline gap-2">
            <p className="text-2xl font-bold leading-tight">{stat.value}</p>
            <p className={`text-sm font-semibold ${stat.deltaClassName}`}>
              {stat.delta}
            </p>
          </div>
        </div>
      ))}
    </section>
  );
}

export default ReportsSummaryStats;
