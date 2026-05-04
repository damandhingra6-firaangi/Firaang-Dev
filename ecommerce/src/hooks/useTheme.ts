import { useEffect, useState } from "react";

export type ThemeType = "dark" | "light";

export function useTheme() {
  const [theme, setTheme] = useState<ThemeType>("dark");
  const [mounted, setMounted] = useState(false);

  // Initialize theme from localStorage on mount
  useEffect(() => {
    const storedTheme = localStorage.getItem("theme") as ThemeType | null;
    const preferredTheme = storedTheme || "dark";
    setTheme(preferredTheme);
    applyTheme(preferredTheme);
    setMounted(true);
  }, []);

  const applyTheme = (newTheme: ThemeType) => {
    const htmlElement = document.documentElement;
    htmlElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  };

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  return { theme, toggleTheme, mounted };
}
