import { Link } from "react-router-dom";

function HeroActions() {
  return (
    <div className="flex flex-wrap gap-4">
      <Link
        to="/permission"
        className="group flex h-14 min-w-45 items-center justify-center gap-2 rounded-xl bg-primary px-8 text-base font-bold text-background-dark shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
      >
        <span className="material-symbols-outlined">add_alert</span>
        Report Heat
      </Link>
      <Link
        to="/dashboard"
        className="flex h-14 min-w-45 items-center justify-center gap-2 rounded-xl border-2 border-primary/20 bg-transparent px-8 text-base font-bold text-text-dark transition-all hover:bg-primary/5 active:scale-95 dark:text-background-light"
      >
        <span className="material-symbols-outlined">map</span>
        View Heat Map
      </Link>
    </div>
  );
}

export default HeroActions;
