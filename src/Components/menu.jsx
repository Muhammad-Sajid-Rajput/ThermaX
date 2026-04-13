import { useEffect, useId, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { HEADER_NAV_ITEMS } from "./header/constants";
import menuStyles from "./header/menuStyles";
import { mobileNavLinkClass } from "./header/navClasses";

function Menu() {
  const [collapsed, setCollapsed] = useState(true);
  const location = useLocation();
  const inputId = useId();

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

  useEffect(() => {
    setCollapsed(true);
  }, [location.pathname]);

  const closeMenu = () => {
    setCollapsed(true);
  };

  return (
    <>
      <style>{menuStyles}</style>
      <div className="mobile-menu md:hidden">
        <input
          id={inputId}
          type="checkbox"
          className="event-wrapper-inp"
          checked={collapsed}
          onChange={(event) => setCollapsed(event.target.checked)}
          aria-label="Toggle mobile menu"
        />
        <label htmlFor={inputId} className="event-wrapper">
          <div className="bar">
            <span className="top bar-list" />
            <span className="middle bar-list" />
            <span className="bottom bar-list" />
          </div>
        </label>

        <section className="menu-container">
          {HEADER_NAV_ITEMS.map((item) => {
            if (item.to) {
              return (
                <NavLink
                  key={item.label}
                  to={item.to}
                  end={item.end}
                  className={() =>
                    mobileNavLinkClass({ isActive: isItemActive(item) })
                  }
                  onClick={closeMenu}
                >
                  {item.label}
                </NavLink>
              );
            }

            return (
              <a
                key={item.label}
                href={item.href}
                className="menu-list"
                onClick={closeMenu}
              >
                {item.label}
              </a>
            );
          })}
        </section>
      </div>
    </>
  );
}

export default Menu;
