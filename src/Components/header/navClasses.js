export const desktopNavLinkClass = ({ isActive }) =>
  `border-b-2 pb-1 text-sm font-semibold transition-colors ${
    isActive
      ? "border-primary text-primary"
      : "border-transparent text-text-dark hover:text-primary dark:text-background-light"
  }`;

export const mobileNavLinkClass = ({ isActive }) =>
  `menu-list ${isActive ? "menu-list--active" : ""}`;
