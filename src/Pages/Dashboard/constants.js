export const DASHBOARD_TITLE = "GeoPulse Dashboard";

export const MAP_IMAGE_URL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDabXmcy0wj8IWDEcKPe4HzVhR3hgr7J5PcyMBkpIsdvFjv3znxM33oFgfYtFrV_K5ZxgxC_NlJ7JMAEtLsenchDk11CeFBhTK19X6LQTN9ct88Ff_mCrS8YFcnsUUe8OH6p86tpfdUpNcuZcSz6JWN_TDCSZCgPHZ7yX9ylVLhaGguos0Q4x-wwgYm6iYFxbMuEYxE0jj5Kbbaruky4uFFSFd6xGXk0p9PQClxMF-VGXwLV2rMiBLgbUi_vVB09Z89sLnkG5end-w";

export const KPI_CARDS = [
  {
    label: "Total Reports",
    value: "1,240",
    meta: "+12%",
    metaClass: "text-primary",
  },
  {
    label: "Active Hotspots",
    value: "12",
    meta: "+2",
    metaClass: "text-heatmap-high",
  },
  {
    label: "Sat Correlation",
    value: "85%",
    meta: "Optimal",
    metaClass: "text-primary",
  },
];

export const MAP_MARKERS = [
  {
    label: "High Congestion",
    markerClass:
      "h-4 w-4 animate-pulse rounded-full border-2 border-background-light bg-heatmap-high",
    wrapperClass: "absolute left-1/3 top-1/4",
  },
  {
    label: "Safe Zone",
    markerClass:
      "h-3 w-3 rounded-full border-2 border-background-light bg-heatmap-low",
    wrapperClass: "absolute bottom-1/3 right-1/4",
  },
];
