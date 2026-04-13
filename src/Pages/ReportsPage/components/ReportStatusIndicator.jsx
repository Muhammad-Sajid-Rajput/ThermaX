function ReportStatusIndicator({ label }) {
  return (
    <section className="px-4 py-6 text-center">
      <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
        <span className="size-2 rounded-full bg-primary animate-pulse"></span>
        {label}
      </div>
    </section>
  );
}

export default ReportStatusIndicator;
