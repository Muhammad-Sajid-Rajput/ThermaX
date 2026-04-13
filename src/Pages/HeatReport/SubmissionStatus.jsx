import { useLocation } from "react-router-dom";
import PipelineFlowCard from "./components/status/PipelineFlowCard";
import StatusBottomActions from "./components/status/StatusBottomActions";
import StatusTopBar from "./components/status/StatusTopBar";
import StatusVisualCard from "./components/status/StatusVisualCard";
import ValidationOutcomes from "./components/status/ValidationOutcomes";
import ValidationProgressCard from "./components/status/ValidationProgressCard";
import {
  PIPELINE_STEPS,
  STATUS_OUTCOME_CONFIG,
  STATUS_OUTCOME_TYPES,
  STATUS_PROGRESS_BY_OUTCOME,
} from "./submissionStatus.constants";

function formatTimestamp(value) {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  return new Date().toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SubmissionStatus() {
  const { state } = useLocation();
  const outcomeType =
    state?.outcomeType && STATUS_OUTCOME_CONFIG[state.outcomeType]
      ? state.outcomeType
      : STATUS_OUTCOME_TYPES.VALID;
  const selectedOutcome = STATUS_OUTCOME_CONFIG[outcomeType];
  const progress = STATUS_PROGRESS_BY_OUTCOME[outcomeType];
  const submissionId = state?.submissionId || "UUID-9928-AX-01";
  const timestamp = formatTimestamp(state?.submittedAt);

  return (
    <div className="min-h-screen bg-background-light font-display text-text-dark dark:bg-background-dark dark:text-background-light flex flex-col">
      <StatusTopBar />
      <main className="flex-1 w-full max-w-4xl mx-auto p-4 space-y-6">
        <ValidationProgressCard progress={progress} />
        <ValidationOutcomes outcomes={[selectedOutcome]} />
        <PipelineFlowCard
          steps={PIPELINE_STEPS}
          submissionId={submissionId}
          timestamp={timestamp}
        />
        <StatusVisualCard />
      </main>
      <StatusBottomActions />
    </div>
  );
}

export default SubmissionStatus;
