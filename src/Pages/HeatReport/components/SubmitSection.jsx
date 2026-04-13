function SubmitSection({ onSubmit }) {
  return (
    <div className="pt-2">
      <button
        type="button"
        onClick={onSubmit}
        className="group flex h-14 w-full items-center justify-center gap-2 rounded-xl px-8 text-base font-bold text-text-dark shadow-lg shadow-primary/20 transition-all hover:opacity-90 active:scale-[0.98]"
        style={{
          background:
            "linear-gradient(135deg, var(--color-primary) 0%, var(--color-heatmap-mid) 100%)",
        }}
      >
        Submit Heat Report
        <span className="material-symbols-outlined">send</span>
      </button>

      <p className="mt-4 px-4 text-center text-xs font-medium text-soft-green">
        By submitting, you agree to share this data for scientific urban
        climate research. Data is anonymized.
      </p>
    </div>
  );
}

export default SubmitSection;
