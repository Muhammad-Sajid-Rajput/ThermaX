function ReportPreviewCard({ bars }) {
  return (
    <section className="px-4 py-2">
      <h3 className="mb-3 flex items-center gap-2 text-lg font-bold">
        <span className="material-symbols-outlined">visibility</span>
        Report Preview
      </h3>

      <div className="overflow-hidden rounded-xl border border-[#cfe7d3] bg-white shadow-lg dark:border-[#2a442f] dark:bg-[#1a2e1d]">
        <div className="p-6">
          <div className="mb-4 flex items-start justify-between border-b-2 border-gray-100 pb-4 dark:border-gray-800">
            <div>
              <div className="mb-2 h-4 w-32 rounded bg-primary/20"></div>
              <div className="h-6 w-48 rounded bg-gray-200 dark:bg-gray-700"></div>
            </div>
            <div className="flex size-12 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
              <span className="material-symbols-outlined text-gray-400">shield</span>
            </div>
          </div>

          <div className="mb-6 space-y-4">
            <div className="flex h-32 items-end justify-around gap-1 rounded-lg bg-gray-50 p-4 dark:bg-[#122315]">
              {bars.map((height, index) => (
                <div
                  key={`${height}-${index}`}
                  className="w-8 rounded-t bg-primary/70"
                  style={{ height: `${height}%` }}
                ></div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="h-3 w-full rounded bg-gray-100 dark:bg-gray-800"></div>
              <div className="h-3 w-5/6 rounded bg-gray-100 dark:bg-gray-800"></div>
              <div className="h-3 w-4/6 rounded bg-gray-100 dark:bg-gray-800"></div>
            </div>
          </div>

          <button
            type="button"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-[#0d1b10] transition-colors hover:bg-primary/90"
          >
            <span className="material-symbols-outlined">fullscreen</span>
            View Full Screen
          </button>
        </div>
      </div>
    </section>
  );
}

export default ReportPreviewCard;
