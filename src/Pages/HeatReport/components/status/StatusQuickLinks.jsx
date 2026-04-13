import { NavLink } from "react-router-dom";

function StatusQuickLinks({ links }) {
  return (
    <div className="flex flex-wrap gap-2">
      {links.map((link) => (
        <NavLink
          key={link.label}
          to={link.to}
          end
          className={({ isActive }) =>
            `inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
              isActive
                ? "border-primary bg-primary/15 text-text-dark"
                : "border-primary/20 bg-white text-soft-green hover:bg-primary/5 dark:bg-background-dark/60 dark:text-background-light"
            }`
          }
        >
          <span className="material-symbols-outlined text-base">{link.icon}</span>
          {link.label}
        </NavLink>
      ))}
    </div>
  );
}

export default StatusQuickLinks;
