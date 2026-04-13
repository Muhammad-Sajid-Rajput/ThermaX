function InferenceSummary() {
  return (
    <div className="flex items-end justify-between px-4 pt-6 pb-2">
      <div>
        <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">
          Inference Engine
        </h3>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/20 px-2.5 py-0.5 text-xs font-bold text-primary">
            <span className="mr-1.5 size-1.5 rounded-full bg-primary animate-pulse"></span>
            92% Confidence
          </span>
        </div>
      </div>

      <div className="text-right font-mono text-[10px] text-slate-400">
        RUN_ID: 0x44A29
        <br />
        TS: 2023-10-27T14:22
      </div>
    </div>
  );
}

export default InferenceSummary;
