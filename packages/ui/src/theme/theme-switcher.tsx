import * as React from "react";
import { Sun, Moon, Eye, Palette, Check, Rows3, Rows4 } from "lucide-react";
import { accentPresets } from "@nexus/tokens";
import { Button } from "../button/button";
import { cn } from "../lib/utils";

export type ThemeMode = "light" | "dark" | "system" | "high-contrast";
export type DensityMode = "comfortable" | "compact";

export function ThemeSwitcher() {
  const [mode, setMode] = React.useState<ThemeMode>("system");
  const [accent, setAccent] = React.useState<string>("indigo");
  const [density, setDensity] = React.useState<DensityMode>("comfortable");
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const savedMode =
      (localStorage.getItem("nexus-theme-mode") as ThemeMode) || "system";
    const savedAccent = localStorage.getItem("nexus-theme-accent") || "indigo";
    const savedDensity =
      (localStorage.getItem("nexus-density") as DensityMode) || "comfortable";

    setMode(savedMode);
    setAccent(savedAccent);
    setDensity(savedDensity);
  }, []);

  const updateMode = (newMode: ThemeMode) => {
    setMode(newMode);
    localStorage.setItem("nexus-theme-mode", newMode);

    const root = document.documentElement;
    root.classList.remove("dark", "high-contrast");

    if (newMode === "dark") {
      root.classList.add("dark");
    } else if (newMode === "high-contrast") {
      root.classList.add("high-contrast");
    } else if (newMode === "system") {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      if (prefersDark) root.classList.add("dark");
    }
  };

  const updateAccent = (newAccent: string) => {
    setAccent(newAccent);
    localStorage.setItem("nexus-theme-accent", newAccent);
    document.documentElement.setAttribute("data-accent", newAccent);
  };

  const updateDensity = (newDensity: DensityMode) => {
    setDensity(newDensity);
    localStorage.setItem("nexus-density", newDensity);
    document.documentElement.setAttribute("data-density", newDensity);
  };

  if (!mounted) return null;

  return (
    <div className="flex flex-col gap-4 p-4 rounded-[10px] bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] shadow-sm">
      {/* Theme Mode */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Appearance Mode
        </span>
        <div className="grid grid-cols-4 gap-1.5 p-1 bg-[var(--color-bg-subtle)] rounded-[8px] border border-[var(--color-border-muted)]">
          <button
            type="button"
            onClick={() => updateMode("light")}
            className={cn(
              "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-[6px] text-xs font-medium transition-colors",
              mode === "light"
                ? "bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] shadow-sm"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]",
            )}
          >
            <Sun className="h-3.5 w-3.5" />
            Light
          </button>
          <button
            type="button"
            onClick={() => updateMode("dark")}
            className={cn(
              "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-[6px] text-xs font-medium transition-colors",
              mode === "dark"
                ? "bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] shadow-sm"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]",
            )}
          >
            <Moon className="h-3.5 w-3.5" />
            Dark
          </button>
          <button
            type="button"
            onClick={() => updateMode("system")}
            className={cn(
              "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-[6px] text-xs font-medium transition-colors",
              mode === "system"
                ? "bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] shadow-sm"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]",
            )}
          >
            <Palette className="h-3.5 w-3.5" />
            System
          </button>
          <button
            type="button"
            onClick={() => updateMode("high-contrast")}
            className={cn(
              "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-[6px] text-xs font-medium transition-colors",
              mode === "high-contrast"
                ? "bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] shadow-sm"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]",
            )}
          >
            <Eye className="h-3.5 w-3.5" />
            Contrast
          </button>
        </div>
      </div>

      {/* Accent Colors */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Accent Palette
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          {Object.entries(accentPresets).map(([key, item]) => {
            const isSelected = accent === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => updateAccent(key)}
                title={item.label}
                aria-label={item.label}
                style={{ backgroundColor: item.primary }}
                className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)]",
                  isSelected &&
                    "ring-2 ring-offset-2 ring-[var(--color-border-focus)] ring-offset-[var(--color-bg-surface)]",
                )}
              >
                {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Density */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Display Density
        </span>
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-[var(--color-bg-subtle)] rounded-[8px] border border-[var(--color-border-muted)]">
          <button
            type="button"
            onClick={() => updateDensity("comfortable")}
            className={cn(
              "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-[6px] text-xs font-medium transition-colors",
              density === "comfortable"
                ? "bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] shadow-sm"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]",
            )}
          >
            <Rows4 className="h-3.5 w-3.5" />
            Comfortable
          </button>
          <button
            type="button"
            onClick={() => updateDensity("compact")}
            className={cn(
              "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-[6px] text-xs font-medium transition-colors",
              density === "compact"
                ? "bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] shadow-sm"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]",
            )}
          >
            <Rows3 className="h-3.5 w-3.5" />
            Compact
          </button>
        </div>
      </div>
    </div>
  );
}
