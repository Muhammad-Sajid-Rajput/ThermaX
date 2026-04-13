import FooterLinks from "./footer/FooterLinks";
import MobileBottomNav from "./footer/MobileBottomNav";
import { FOOTER_INFO, FOOTER_LINKS, MOBILE_NAV_ITEMS } from "./footer/constants";

function Footer() {
  return (
    <>
      <footer className="border-t border-primary/10 bg-white px-4 py-8 dark:bg-background-dark sm:px-6 sm:py-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-between gap-5 text-center md:flex-row md:gap-6 md:text-left">
            <div className="flex flex-col items-center gap-3 md:flex-row md:gap-6">
              <div
                className="h-10 w-28 bg-contain bg-center bg-no-repeat opacity-60 grayscale transition-all hover:grayscale-0 sm:w-32 md:bg-left"
                style={{
                  backgroundImage: `url("${FOOTER_INFO.logoUrl}")`,
                }}
                data-alt="University affiliation logo"
              />
              <div className="hidden h-px w-8 bg-primary/20 md:block" />
              <p className="max-w-xs text-xs font-medium leading-relaxed text-soft-green">
                {FOOTER_INFO.organization}
              </p>
            </div>

            <FooterLinks links={FOOTER_LINKS} />
          </div>

          <div className="mt-5 border-t border-primary/5 pt-5 text-center sm:mt-6 sm:pt-6">
            <p className="px-2 text-[10px] font-medium uppercase tracking-[0.12em] text-soft-green sm:tracking-[0.2em]">
              {FOOTER_INFO.copyright}
            </p>
          </div>
        </div>
      </footer>

      <MobileBottomNav items={MOBILE_NAV_ITEMS} />
    </>
  );
}

export default Footer;
