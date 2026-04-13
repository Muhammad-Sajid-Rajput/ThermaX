function PhotoEvidenceSection() {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-bold sm:text-lg">Photo Evidence</h2>

      <label className="group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/25 bg-background-light p-8 text-center transition hover:bg-primary/5 dark:bg-background-dark/70 dark:hover:bg-primary/10">
        <span className="material-symbols-outlined text-4xl text-primary">
          add_a_photo
        </span>
        <p className="text-sm font-medium text-soft-green">
          Tap to upload or capture a photo
        </p>
        <p className="text-[10px] font-bold uppercase tracking-widest text-soft-green/80">
          JPG, JPEG, PNG up to 10MB
        </p>
        <input type="file" accept=".jpg,.jpeg,.png" className="hidden" />
      </label>
    </section>
  );
}

export default PhotoEvidenceSection;
