"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "flouna-theme";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * The script that runs before first paint, inlined in the document head.
 *
 * Without it the page renders light, then swaps to dark once React hydrates —
 * a white flash on every load for anyone using dark mode, which is exactly
 * when it is most unpleasant. Reading the stored choice synchronously here is
 * the only way to have the correct theme on the very first frame.
 */
export const themeInitScript = `(function(){try{
var t=localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
if(t==="dark")document.documentElement.setAttribute("data-theme","dark");
}catch(e){}})();`;

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Read from the attribute the inline script already set, rather than
  // syncing in an effect — an effect would render once with the wrong value
  // and immediately re-render, which is both a cascading render and the flash
  // the script exists to prevent.
  const [theme, setThemeState] = useState<Theme>(() =>
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-theme") === "dark"
      ? "dark"
      : "light",
  );

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    const root = document.documentElement;
    if (t === "dark") root.setAttribute("data-theme", "dark");
    else root.removeAttribute("data-theme");
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      // Not persisting is survivable; the current session still switches.
    }
  }, []);

  const toggle = useCallback(
    () => setTheme(theme === "dark" ? "light" : "dark"),
    [theme, setTheme],
  );

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
