import Brand from "./header/Brand";
import DesktopNav from "./header/DesktopNav";
import Menu from "./menu";
import Toggle from "./toggle";

function Header() {
  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 w-full border-b border-primary/10 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Brand />

          <div className="flex items-center gap-4">
            <DesktopNav />

            <Toggle />
            <Menu />
          </div>
        </div>
      </header>
      <div className="h-16" />
    </>
  );
}

export default Header;
