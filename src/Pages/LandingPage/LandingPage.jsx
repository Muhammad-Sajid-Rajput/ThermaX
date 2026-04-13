import Footer from "../../Components/Footer";
import Header from "../../Components/Header";
import Features from "./Features";
import HeroSection from "./HeroSection";

function LandingPage() {
  return (
    <div className="min-h-screen bg-background-light font-display text-text-dark antialiased dark:bg-background-dark dark:text-background-light">
      <Header />
      <main>
        <HeroSection />
        <Features />
      </main>
      <Footer />
    </div>
  );
}

export default LandingPage;
