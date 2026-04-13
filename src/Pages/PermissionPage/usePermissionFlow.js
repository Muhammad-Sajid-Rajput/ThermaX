import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LOCATION_STATUS, REPORT_PERMISSION_KEY } from "./constants";

function usePermissionFlow() {
  const navigate = useNavigate();
  const [locationAccess, setLocationAccess] = useState(() =>
    typeof window !== "undefined" &&
    window.sessionStorage.getItem(REPORT_PERMISSION_KEY) === "granted"
      ? LOCATION_STATUS.GRANTED
      : LOCATION_STATUS.DENIED,
  );

  const requestLocation = () => {
    if (locationAccess === LOCATION_STATUS.GRANTED) {
      navigate("/report");
      return;
    }

    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      () => {
        window.sessionStorage.setItem(REPORT_PERMISSION_KEY, "granted");
        setLocationAccess(LOCATION_STATUS.GRANTED);
        navigate("/report");
      },
      (error) => {
        window.sessionStorage.removeItem(REPORT_PERMISSION_KEY);
        setLocationAccess(LOCATION_STATUS.DENIED);
        console.error("Geolocation error:", error);
        navigate("/permission/denied", {
          state: {
            reason: error?.message || "Location permission denied.",
          },
        });
      },
    );
  };

  const selectLocationManually = () => {
    alert("Manual location selection not implemented yet.");
  };

  return {
    locationAccess,
    requestLocation,
    selectLocationManually,
  };
}

export default usePermissionFlow;
