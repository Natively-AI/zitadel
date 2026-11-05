"use client";

// NativelyAI fork: theme switch, as in the Builder (conductor frontend/app/components/ui/theme-toggle.tsx):
// a square button showing the current theme's icon that opens a Light / Dark / System menu.
// Shown on every login screen and on each design-preview box (/email/preview).
//
// Sets data-theme on <html>, which natively.css uses to force a theme, and remembers the
// choice in localStorage. THEME_INIT_SCRIPT (run in <head> by the layout) applies the saved
// choice before the first paint, so the page doesn't flash the other theme.

import { MonitorIcon, MoonIcon, SunIcon, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const STORAGE_KEY = "natively-theme";
const CHANGE_EVENT = "natively-theme-change";

// design-system icons: lucide glyphs at 16px ("sm") with a 1.5 stroke
const ICON_PROPS = { size: 16, strokeWidth: 1.5, "aria-hidden": true, className: "shrink-0" } as const;

const OPTIONS: { value: ThemeChoice; icon: LucideIcon; label: string }[] = [
  { value: "light", icon: SunIcon, label: "Light" },
  { value: "dark", icon: MoonIcon, label: "Dark" },
  { value: "system", icon: MonitorIcon, label: "System" },
];

type ThemeChoice = "light" | "dark" | "system";

export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${STORAGE_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

function readTheme(): ThemeChoice {
  const theme = document.documentElement.dataset.theme;
  return theme === "light" || theme === "dark" ? theme : "system";
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

function applyTheme(theme: ThemeChoice) {
  const root = document.documentElement;
  if (theme === "system") {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = theme;
  }
  try {
    if (theme === "system") {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, theme);
    }
  } catch {
    // storage blocked (private mode, in-app browser): the choice lasts until the page reloads
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  // the server doesn't know the stored choice, so it renders the System icon
  const theme = useSyncExternalStore(subscribe, readTheme, () => "system" as const);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const ActiveIcon = OPTIONS.find((option) => option.value === theme)?.icon ?? MonitorIcon;

  return (
    <div ref={ref} className={`z-10 ${className}`}>
      <button
        type="button"
        aria-label="Switch theme"
        title="Switch theme"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="bg-secondary text-fg-muted hover:bg-secondary-hover hover:text-fg flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition-colors"
      >
        <ActiveIcon {...ICON_PROPS} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Theme"
          className="border-line bg-popover shadow-elevation-md rounded-ds-md absolute right-0 mt-1.5 w-40 border p-1"
        >
          {OPTIONS.map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              type="button"
              role="menuitemradio"
              aria-checked={theme === value}
              onClick={() => {
                applyTheme(value);
                setOpen(false);
              }}
              className={`flex w-full cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-sm whitespace-nowrap transition-colors ${
                theme === value ? "bg-secondary text-fg" : "text-fg-muted hover:bg-secondary/50 hover:text-fg"
              }`}
            >
              <Icon {...ICON_PROPS} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
