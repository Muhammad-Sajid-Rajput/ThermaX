import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DEFAULT_CAUSES } from "./constants";
import { STATUS_OUTCOME_TYPES } from "./submissionStatus.constants";

const resolveOutcomeType = () => {
  const roll = Math.random();

  if (roll < 0.1) {
    return STATUS_OUTCOME_TYPES.ANOMALY;
  }

  if (roll < 0.3) {
    return STATUS_OUTCOME_TYPES.DUPLICATE;
  }

  return STATUS_OUTCOME_TYPES.VALID;
};

function useHeatReportForm() {
  const navigate = useNavigate();
  const [severity, setSeverity] = useState(3);
  const [causes, setCauses] = useState(() => ({ ...DEFAULT_CAUSES }));
  const [comment, setComment] = useState("");

  const loggedAt = useMemo(
    () =>
      new Date().toLocaleString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [],
  );

  const submissionId = useMemo(() => {
    const randomToken = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `UUID-${Date.now().toString().slice(-4)}-${randomToken}`;
  }, []);

  const handleCheckbox = (key) => {
    setCauses((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSubmit = () => {
    const outcomeType = resolveOutcomeType();

    console.log({ severity, causes, comment, submissionId, loggedAt });
    navigate("/report/status", {
      state: {
        submissionId,
        submittedAt: loggedAt,
        outcomeType,
      },
    });
  };

  return {
    severity,
    setSeverity,
    causes,
    handleCheckbox,
    comment,
    setComment,
    loggedAt,
    handleSubmit,
  };
}

export default useHeatReportForm;
