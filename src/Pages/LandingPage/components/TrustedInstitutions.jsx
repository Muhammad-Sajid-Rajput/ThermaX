function TrustedInstitutions({ institutions }) {
  return (
    <div className="flex items-center gap-4 border-t border-primary/10 pt-6">
      <div className="flex -space-x-3 gap-4">
        {institutions.map((institution) => (
          <div
            key={institution}
            className="flex size-10 items-center justify-center rounded-full border-2 border-background-light bg-primary/20 text-[10px] font-bold text-text-dark dark:border-background-dark"
          >
            {institution}
          </div>
        ))}
      </div>
      <p className="text-sm font-medium text-soft-green">
        Trusted by leading academic institutions
      </p>
    </div>
  );
}

export default TrustedInstitutions;
