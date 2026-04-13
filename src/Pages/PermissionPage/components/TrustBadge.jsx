function TrustBadge() {
  return (
    <div className="mt-8 flex items-center gap-2 text-xs text-soft-green/80">
      <span className="material-symbols-outlined text-sm">lock</span>
      <span>Your data is encrypted and used only for heat safety reporting</span>
    </div>
  );
}

export default TrustBadge;
