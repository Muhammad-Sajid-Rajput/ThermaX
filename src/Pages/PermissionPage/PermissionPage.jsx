import Header from "../../Components/Header";
import PermissionCard from "./components/PermissionCard";
import TrustBadge from "./components/TrustBadge";
import usePermissionFlow from "./usePermissionFlow";
import { useNavigate } from "react-router-dom";

const PermissionPage = () => {
  const navigate = useNavigate();
  const { locationAccess, requestLocation, selectLocationManually } =
    usePermissionFlow();
  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background-light font-display text-text-dark dark:bg-background-dark dark:text-background-light">
      <Header />
      <div className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
        <div className="flex justify-start">
          <button
            type="button"
            className="inline-flex h-10 items-center rounded-lg bg-primary px-3 text-xs font-semibold text-text-dark shadow-sm shadow-primary/20 transition-opacity hover:opacity-90"
            onClick={handleBack}
            aria-label="Go to previous page"
            title="Go to previous page"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
        </div>
      </div>
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <PermissionCard
          locationAccess={locationAccess}
          onRequestLocation={requestLocation}
          onSelectLocationManually={selectLocationManually}
        />
        <TrustBadge />
      </main>
    </div>
  );
};

export default PermissionPage;
