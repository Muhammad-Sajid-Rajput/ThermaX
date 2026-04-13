import Footer from "../../Components/Footer";
import Header from "../../Components/Header";
import CausesSection from "./components/CausesSection";
import LocationCard from "./components/LocationCard";
import ObservationsSection from "./components/ObservationsSection";
import PhotoEvidenceSection from "./components/PhotoEvidenceSection";
import ProgressSteps from "./components/ProgressSteps";
import SeveritySection from "./components/SeveritySection";
import SubmitSection from "./components/SubmitSection";
import {
  CAUSE_OPTIONS,
  CURRENT_LOCATION,
  REPORT_STEPS,
  SEVERITY_LABELS,
  FORM_TITLE,
} from "./constants";
import useHeatReportForm from "./useHeatReportForm";

function HeatReportForm() {
  const {
    severity,
    setSeverity,
    causes,
    handleCheckbox,
    comment,
    setComment,
    loggedAt,
    handleSubmit,
  } = useHeatReportForm();

  return (
    <div className="relative min-h-screen overflow-hidden bg-background-light font-display text-text-dark antialiased dark:bg-background-dark dark:text-background-light">
      <div className="pointer-events-none absolute -left-24 top-20 size-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-20 size-72 rounded-full bg-soft-green/10 blur-3xl" />

      <Header />
      <main className="relative z-10 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <section className="rounded-2xl border border-primary/12 bg-white/95 p-6 shadow-xl shadow-primary/5 backdrop-blur-sm dark:bg-background-dark/90 sm:p-8">
            <div className="space-y-6">
              <h1 className="text-xl font-bold tracking-tight">{FORM_TITLE}</h1>
              <ProgressSteps steps={REPORT_STEPS} />
              <LocationCard location={CURRENT_LOCATION} loggedAt={loggedAt} />
              <SeveritySection
                severity={severity}
                severityLabels={SEVERITY_LABELS}
                onSeverityChange={setSeverity}
              />
              <CausesSection
                causeOptions={CAUSE_OPTIONS}
                causes={causes}
                onToggleCause={handleCheckbox}
              />
              <ObservationsSection
                comment={comment}
                onCommentChange={setComment}
              />
              <PhotoEvidenceSection />
              <SubmitSection onSubmit={handleSubmit} />
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default HeatReportForm;
