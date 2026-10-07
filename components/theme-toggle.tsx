"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-9 h-9 rounded-xl border border-border" />;
  }

  const isDark = (theme === "system" ? resolvedTheme : theme) === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative p-2.5 rounded-xl border border-border/60 bg-card/60 backdrop-blur-md hover:bg-muted/80 text-foreground transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-sm"
      aria-label="Toggle theme"
      title="Toggle light/dark theme"
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-amber-400 transition-transform rotate-0 hover:rotate-45" />
      ) : (
        <Moon className="h-4 w-4 text-slate-700 transition-transform -rotate-12 hover:rotate-0" />
      )}
    </button>
  );
}
