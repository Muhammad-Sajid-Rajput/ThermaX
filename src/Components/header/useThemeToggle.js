import { useEffect, useState } from "react";
import { DARK_MEDIA_QUERY, THEME_STORAGE_KEY } from "./constants";

const resolveSystemTheme = () => {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia(DARK_MEDIA_QUERY).matches ? "dark" : "light";
};

const resolveInitialTheme = () => {
  if (typeof window === "undefined") {
    return "light";
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (storedTheme === "dark" || storedTheme === "light") {
    return storedTheme;
  }

  return resolveSystemTheme();
};

const resolveSystemMode = () => {
  if (typeof window === "undefined") {
    return true;
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return storedTheme !== "dark" && storedTheme !== "light";
};

function useThemeToggle() {
  const [theme, setTheme] = useState(resolveInitialTheme);
  const [followsSystemTheme, setFollowsSystemTheme] =
    useState(resolveSystemMode);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    if (!followsSystemTheme || typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia(DARK_MEDIA_QUERY);
    const handleThemeChange = (event) => {
      setTheme(event.matches ? "dark" : "light");
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleThemeChange);
    } else {
      mediaQuery.addListener(handleThemeChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleThemeChange);
      } else {
        mediaQuery.removeListener(handleThemeChange);
      }
    };
  }, [followsSystemTheme]);

  const handleThemeToggle = (event) => {
    const nextTheme = event.target.checked ? "light" : "dark";
    setTheme(nextTheme);
    setFollowsSystemTheme(false);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  };

  return {
    isLightTheme: theme === "light",
    handleThemeToggle,
  };
}

export default useThemeToggle;
