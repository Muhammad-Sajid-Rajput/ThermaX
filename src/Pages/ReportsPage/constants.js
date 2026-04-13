export const REPORT_STATS = [
  {
    icon: "description",
    label: "Reports This Week",
    value: "12",
    delta: "+2%",
    deltaClassName: "text-primary",
  },
  {
    icon: "check_circle",
    label: "Mitigation Success",
    value: "98%",
    delta: "-1%",
    deltaClassName: "text-red-500",
  },
];

export const REPORT_PREVIEW_BARS = [40, 70, 90, 55, 85];

export const REPORT_EXPORT_OPTIONS = [
  {
    id: "pdf",
    icon: "picture_as_pdf",
    title: "Generate PDF Report",
    description: "Official document format for distribution",
    wrapperClassName:
      "border-red-100 bg-red-50 hover:bg-red-100 dark:border-red-900/30 dark:bg-red-950/20",
    iconClassName: "bg-red-500 text-white",
    titleClassName: "text-red-700 dark:text-red-400",
    descriptionClassName: "text-red-600/70 dark:text-red-400/60",
    chevronClassName: "text-red-300",
  },
  {
    id: "csv",
    icon: "table_view",
    title: "Export Data as CSV",
    description: "Raw data for analysis in spreadsheets",
    wrapperClassName:
      "border-primary/20 bg-primary/10 hover:bg-primary/20 dark:bg-primary/5",
    iconClassName: "bg-primary text-[#0d1b10]",
    titleClassName: "text-[#0d1b10] dark:text-primary",
    descriptionClassName: "text-[#4c9a59] dark:text-primary/60",
    chevronClassName: "text-primary/40",
  },
];

export const LAST_REPORT_LABEL = "Last Report Generated: 2 hours ago";
