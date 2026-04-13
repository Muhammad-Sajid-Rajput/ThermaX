function ReportExportOptions({ options }) {
  return (
    <section className="space-y-3 p-4">
      <h3 className="mb-1 flex items-center gap-2 text-lg font-bold">
        <span className="material-symbols-outlined">ios_share</span>
        Export Options
      </h3>

      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className={`flex w-full items-center gap-4 rounded-xl border p-4 transition-colors ${option.wrapperClassName}`}
        >
          <div
            className={`flex size-10 items-center justify-center rounded-lg ${option.iconClassName}`}
          >
            <span className="material-symbols-outlined">{option.icon}</span>
          </div>

          <div className="text-left">
            <p className={`font-bold ${option.titleClassName}`}>{option.title}</p>
            <p className={`text-xs ${option.descriptionClassName}`}>
              {option.description}
            </p>
          </div>

          <span className={`material-symbols-outlined ml-auto ${option.chevronClassName}`}>
            chevron_right
          </span>
        </button>
      ))}
    </section>
  );
}

export default ReportExportOptions;
