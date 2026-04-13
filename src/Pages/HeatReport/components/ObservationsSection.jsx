function ObservationsSection({ comment, onCommentChange }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-bold sm:text-lg">
        Additional observations
        <span className="ml-2 text-sm font-medium text-soft-green">
          (Optional)
        </span>
      </h2>

      <textarea
        rows="3"
        value={comment}
        onChange={(event) => onCommentChange(event.target.value)}
        placeholder="Describe the local environment or specific heat impacts..."
        className="w-full rounded-lg border border-primary/15 bg-white p-3 text-sm leading-relaxed outline-none transition placeholder:text-soft-green/70 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-background-dark"
      />
    </section>
  );
}

export default ObservationsSection;
