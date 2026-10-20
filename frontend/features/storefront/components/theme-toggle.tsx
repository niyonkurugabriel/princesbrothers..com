"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";
const THEME_KEY = "pb-theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const savedTheme = window.sessionStorage.getItem(THEME_KEY);
    const initialTheme: Theme = savedTheme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = initialTheme;
    setTheme(initialTheme);
  }, []);

  function toggleTheme() {
    const nextTheme: Theme = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = nextTheme;
    window.sessionStorage.setItem(THEME_KEY, nextTheme);
    setTheme(nextTheme);
  }

  return (
    <button
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
      aria-pressed={theme === "dark"}
      className="theme-toggle"
      onClick={toggleTheme}
      type="button"
    >
      {theme === "light" ? <Moon aria-hidden="true" size={16} /> : <Sun aria-hidden="true" size={16} />}
      {theme === "light" ? "Dark theme" : "Light theme"}
    </button>
  );
}
