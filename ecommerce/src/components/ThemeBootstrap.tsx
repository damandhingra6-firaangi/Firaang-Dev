"use client";

import { useEffect } from "react";

export default function ThemeBootstrap() {
  useEffect(() => {
    // Get theme from localStorage or default to "dark"
    const storedTheme = localStorage.getItem("theme") || "dark";
    document.documentElement.setAttribute("data-theme", storedTheme);
  }, []);

  return null;
}
