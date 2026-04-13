import { NavLink, useLocation } from "react-router-dom";
import { HEADER_NAV_ITEMS } from "./constants";
import { desktopNavLinkClass } from "./navClasses";

function DesktopNav() {
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

    if (item.end) {
      return location.pathname === item.to;
    }

    return (
      location.pathname === item.to ||
      location.pathname.startsWith(`${item.to}/`)
    );
  };

  return (
    <nav className="hidden items-center gap-8 md:flex">
      {HEADER_NAV_ITEMS.map((item) => {
        if (item.to) {
          return (
            <NavLink
              key={item.label}
              className={() =>
                desktopNavLinkClass({ isActive: isItemActive(item) })
              }
              to={item.to}
              end={item.end}
            >
              {item.label}
            </NavLink>
          );
        }
      })}
    </nav>
  );
}

export default DesktopNav;
