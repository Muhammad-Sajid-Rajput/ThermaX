import { HEADER_BRAND } from "./constants";

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-background-dark dark:text-background-light">
        <span className="material-symbols-outlined text-2xl font-bold">
          {HEADER_BRAND.icon}
        </span>
      </div>

      <span className="hidden text-lg font-bold tracking-tight text-text-dark dark:text-background-light sm:block">
        {HEADER_BRAND.name}
      </span>
      <span className="block text-lg font-bold tracking-tight text-text-dark dark:text-background-light sm:hidden">
        {HEADER_BRAND.name}
      </span>
    </div>
  );
}

export default Brand;
