import toggleStyles from "./header/toggleStyles";
import useThemeToggle from "./header/useThemeToggle";

function Toggle() {
  const { isLightTheme, handleThemeToggle } = useThemeToggle();

  return (
    <>
      <style>{toggleStyles}</style>
      <label htmlFor="theme-switch" className="theme-switch">
        <input
          id="theme-switch"
          type="checkbox"
          checked={isLightTheme}
          onChange={handleThemeToggle}
          aria-label="Toggle light and dark mode"
        />
        <span className="theme-switch__slider" />
        <span className="theme-switch__decoration" />
      </label>
    </>
  );
}

export default Toggle;
