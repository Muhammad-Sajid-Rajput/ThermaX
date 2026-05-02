export const STATUS_OUTCOME_TYPES = {
  VALID: 'valid',
  DUPLICATE: 'duplicate',
  ANOMALY: 'anomaly',
};
export const STATUS_PROGRESS_BY_OUTCOME = {
  [STATUS_OUTCOME_TYPES.VALID]: 100,
  [STATUS_OUTCOME_TYPES.DUPLICATE]: 100,
  [STATUS_OUTCOME_TYPES.ANOMALY]: 75,
};
export const STATUS_OUTCOME_CONFIG = {
  [STATUS_OUTCOME_TYPES.VALID]: {
    title: 'Valid Data - Report Added',
    description:
      'Your submission has been successfully verified and merged into the primary database.',
    icon: 'check_circle',
    iconClass: 'text-primary',
    iconWrapClass: 'bg-primary/20',
    borderClass: 'border-primary',
    showDashboardLink: true,
  },
  [STATUS_OUTCOME_TYPES.DUPLICATE]: {
    title: 'Duplicate Detected',
    description:
      'Similar data found. We merged this submission with existing report ID #8291.',
    icon: 'info',
    iconClass: 'text-heatmap-mid',
    iconWrapClass: 'bg-heatmap-mid/15',
    borderClass: 'border-heatmap-mid',
  },
  [STATUS_OUTCOME_TYPES.ANOMALY]: {
    title: 'Anomaly Detected',
    description:
      'Unusual patterns identified. This submission is pending manual review by our team.',
    icon: 'warning',
    iconClass: 'text-heatmap-high',
    iconWrapClass: 'bg-heatmap-high/10',
    borderClass: 'border-heatmap-high',
  },
};
export const PIPELINE_STEPS = [
  { label: 'Client', icon: 'smartphone', state: 'complete' },
  { label: 'Application', icon: 'dns', state: 'complete' },
  { label: 'ML Layer', icon: 'psychology', state: 'active' },
];
