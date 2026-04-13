export const CAUSE_OPTIONS = [
  ["trees", "Lack of trees"],
  ["traffic", "Heavy traffic"],
  ["concrete", "Concrete surfaces"],
  ["shade", "No shade"],
];
export const FORM_TITLE = "Report a Heat Issue";

export const DEFAULT_CAUSES = {
  trees: true,
  traffic: false,
  concrete: true,
  shade: false,
};

export const SEVERITY_LABELS = ["Low", "Mild", "Moderate", "High", "Extreme"];

export const REPORT_STEPS = [
  { label: "Permission", state: "done" },
  { label: "Location", state: "done" },
  { label: "Severity", state: "active" },
  { label: "Submit", state: "pending" },
];

export const CURRENT_LOCATION = "123 Science Dr, Metro City District 4";
