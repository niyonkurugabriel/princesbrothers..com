"use client";

import { useEffect } from "react";

export function ThemeSession() {
  useEffect(() => {
    document.documentElement.dataset.theme =
      window.sessionStorage.getItem("pb-theme") === "dark" ? "dark" : "light";
  }, []);

  return null;
}
