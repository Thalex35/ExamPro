import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ThemeContext, type Theme } from "@/lib/theme-context";

const STORAGE_KEY = "exampro-theme";

function readTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const savedTheme = readTheme();
    applyTheme(savedTheme);
    setTheme(savedTheme);
  }, []);

  useEffect(() => {
    const syncTheme = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        const nextTheme = event.newValue === "dark" ? "dark" : "light";
        applyTheme(nextTheme);
        setTheme(nextTheme);
      }
    };
    window.addEventListener("storage", syncTheme);
    return () => window.removeEventListener("storage", syncTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === "light" ? "dark" : "light";
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // The current page still changes theme when persistent storage is unavailable.
      }
      applyTheme(next);
      return next;
    });
  }, []);

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}
