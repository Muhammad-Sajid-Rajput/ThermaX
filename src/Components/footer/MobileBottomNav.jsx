import { NavLink, useLocation } from "react-router-dom";

function MobileBottomNav({ items }) {
  const location = useLocation();

  const isItemActive = (item) => {
    if (item.activePrefixes?.length) {
      return item.activePrefixes.some(
        (prefix) =>
          location.pathname === prefix ||
          location.pathname.startsWith(`${prefix}/`),
      );
    }

    if (!item.to) {
      return false;
    }

    if (item.end ?? item.to === "/") {
      return location.pathname === item.to;
    }

    return (
      location.pathname === item.to ||
      location.pathname.startsWith(`${item.to}/`)
    );
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-primary/10 bg-white/90 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-md dark:bg-background-dark/90 md:hidden">
        {items.map((item) => {
          if (item.to) {
            const active = isItemActive(item);

            return (
              <NavLink
                key={item.label}
                to={item.to}
                end={item.end ?? item.to === "/"}
                className={() =>
                  `flex min-h-14 flex-1 flex-col items-center justify-center gap-1 ${
                    active ? "text-primary" : "text-soft-green"
                  }`
                }
              >
                <span
                  className="material-symbols-outlined"
                  style={item.fill ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  {item.icon}
                </span>
                <p className="text-[10px] font-bold">{item.label}</p>
              </NavLink>
            );
          }

          return (
            <a
              key={item.label}
              className="flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-soft-green"
              href={item.href}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <p className="text-[10px] font-bold">{item.label}</p>
            </a>
          );
        })}
      </div>
      <div className="h-24 md:hidden" />
    </>
  );
}

export default MobileBottomNav;
