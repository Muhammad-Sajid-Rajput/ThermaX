export const HEADER_BRAND = {
  name: "ThermaX",
  icon: "thermostat",
};

export const NAV_ITEMS = [
  {
    label: "Home",
    mobileLabel: "Home",
    icon: "home",
    to: "/",
    end: true,
    fill: true,
  },
  {
    label: "Report Heat",
    mobileLabel: "Report",
    icon: "add_circle",
    to: "/permission",
    activePrefixes: ["/permission", "/report"],
  },
  {
    label: "Dashboard",
    mobileLabel: "Map",
    icon: "map",
    to: "/dashboard",
  },
];

export const HEADER_NAV_ITEMS = NAV_ITEMS.map(
  ({ label, to, end, activePrefixes, href }) => ({
    label,
    to,
    end,
    activePrefixes,
    href,
  }),
);

export const MOBILE_NAV_ITEMS = NAV_ITEMS.map(
  ({ mobileLabel, label, icon, to, end, fill, href, activePrefixes }) => ({
    label: mobileLabel ?? label,
    icon,
    to,
    end,
    fill,
    href,
    activePrefixes,
  }),
);

export const THEME_STORAGE_KEY = "thermax-theme";
export const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";
