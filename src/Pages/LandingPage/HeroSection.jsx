import { HERO_DATA, TRUSTED_INSTITUTIONS } from "./constants";
import HeroActions from "./components/HeroActions";
import HeroContent from "./components/HeroContent";
import HeroPreviewCard from "./components/HeroPreviewCard";
import TrustedInstitutions from "./components/TrustedInstitutions";

function HeroSection() {
  return (
    <section className="relative overflow-hidden px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-10">
          <div className="flex flex-col gap-6">
            <HeroContent
              titleStart={HERO_DATA.titleStart}
              titleHighlight={HERO_DATA.titleHighlight}
              titleEnd={HERO_DATA.titleEnd}
              subtitle={HERO_DATA.subtitle}
              description={HERO_DATA.description}
            />
            <HeroActions />
            <TrustedInstitutions institutions={TRUSTED_INSTITUTIONS} />
          </div>

          <HeroPreviewCard
            imageUrl={HERO_DATA.previewImage}
            focusLabel={HERO_DATA.previewFocus}
            tempLabel={HERO_DATA.previewTemp}
            deltaLabel={HERO_DATA.previewDelta}
          />
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
