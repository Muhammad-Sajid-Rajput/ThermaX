import { KPI_CARDS } from "../constants";

function KpiCard({ card }) {
  return (
    <article className="min-w-35 flex-1 rounded-xl border border-primary/10 bg-white p-3 shadow-sm dark:border-primary/20 dark:bg-surface-dark">
      <p className="text-[10px] font-semibold uppercase text-soft-green">{card.label}</p>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-lg font-bold">{card.value}</span>
        <span className={`text-[10px] font-medium ${card.metaClass}`}>{card.meta}</span>
      </div>
    </article>
  );
}

function AvgSeverityCard() {
  return (
    <article className="min-w-35 flex-1 rounded-xl border border-primary/10 bg-white p-3 shadow-sm dark:border-primary/20 dark:bg-surface-dark">
      <p className="text-[10px] font-semibold uppercase text-soft-green">Avg. Severity</p>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-lg font-bold">3.8</span>
        <div className="mb-0.5 flex gap-0.5">
          <span className="h-1.5 w-1.5 rounded-full bg-heatmap-high" />
          <span className="h-1.5 w-1.5 rounded-full bg-heatmap-high" />
          <span className="h-1.5 w-1.5 rounded-full bg-heatmap-high" />
          <span className="h-1.5 w-1.5 rounded-full bg-primary/25" />
          <span className="h-1.5 w-1.5 rounded-full bg-primary/25" />
        </div>
      </div>
    </article>
  );
}

function KpiSection() {
  return (
    <section className="bg-background-light px-4 pb-6 pt-4 dark:bg-background-dark">
      <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {KPI_CARDS.slice(0, 2).map((card) => (
          <KpiCard key={card.label} card={card} />
        ))}

        <AvgSeverityCard />
        <KpiCard card={KPI_CARDS[2]} />
      </div>
    </section>
  );
}

export default KpiSection;
