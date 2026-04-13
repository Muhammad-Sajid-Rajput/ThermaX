import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { label: "Map", icon: "map", to: "/dashboard" },
  { label: "Insight", icon: "analytics", to: "/insight" },
  { label: "Reports", icon: "description", to: "/reports" },
  { label: "Home", icon: "home", to: "/" },
];

function InsightBottomNav() {
  return (
    <nav className="fixed right-0 bottom-0 left-0 z-50 border-t border-slate-200 bg-white/90 backdrop-blur-lg dark:border-slate-800 dark:bg-background-dark/90 md:hidden">
      <div className="flex items-center justify-around px-4 py-2">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 ${
                isActive ? "text-primary" : "text-slate-400"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className="material-symbols-outlined">{item.icon}</span>
                <span className={`text-[10px] ${isActive ? "font-bold" : "font-medium"}`}>
                  {item.label}
                </span>
                {isActive ? <div className="size-1 rounded-full bg-primary"></div> : null}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export default InsightBottomNav;
