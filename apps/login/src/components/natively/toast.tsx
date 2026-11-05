"use client";

// NativelyAI fork: toasts that look and behave like the Toast in @natively-ai/design-system
// (src/components/toast/toast.tsx). That package is private and built on sonner, so this is a
// small copy of its card without the dependency: bottom-right (full width on phones), 5s,
// an icon per tone, neutral and warning on a white card in both themes, danger tinted,
// an inline action link, a dismiss button, Escape closes, hover or focus pauses the timer.

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

export type ToastTone = "neutral" | "success" | "warning" | "danger";

export type ToastInput = {
  /** Reuse an id to replace a toast that's already showing. */
  id?: string;
  tone?: ToastTone;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** A link after the description for a quick follow-up. Clicking it closes the toast. */
  action?: { label: string; onClick: () => void };
};

type Toast = ToastInput & { key: number };

const TOAST_DURATION = 5000;

/**
 * A link inside a toast's message. No underline: full-strength text and medium weight set it
 * apart from the muted message; it underlines on hover.
 */
export const toastLinkClass =
  "text-fg cursor-pointer rounded-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring";
const MAX_VISIBLE = 3;

const ToastContext = createContext<{ show: (toast: ToastInput) => void; dismiss: (id?: string) => void } | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const remove = useCallback((key: number) => setToasts((all) => all.filter((t) => t.key !== key)), []);

  const show = useCallback((toast: ToastInput) => {
    const key = ++counter.current;
    setToasts((all) => [...all.filter((t) => !toast.id || t.id !== toast.id), { ...toast, key }].slice(-MAX_VISIBLE));
  }, []);

  const dismiss = useCallback((id?: string) => {
    setToasts((all) => (id ? all.filter((t) => t.id !== id) : []));
  }, []);

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      <section
        aria-label="Notifications"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[1500] flex flex-col items-end gap-3.5 sm:inset-x-auto sm:right-6 sm:bottom-6"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.key} toast={toast} onClose={() => remove(toast.key)} />
        ))}
      </section>
    </ToastContext.Provider>
  );
}

const iconProps = {
  "aria-hidden": true,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const ICONS: Record<ToastTone, React.ReactNode> = {
  neutral: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  ),
  success: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  warning: (
    <svg {...iconProps}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  ),
  danger: (
    <svg {...iconProps}>
      <path d="M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86z" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  ),
};

const TONES: Record<ToastTone, string> = {
  neutral: "border-line [&_[data-slot=toast-icon]]:text-status-neutral",
  success: "border-success/40 bg-linear-to-r from-success/10 to-success/10 [&_[data-slot=toast-icon]]:text-success",
  warning: "border-line [&_[data-slot=toast-icon]]:text-status-warning",
  danger:
    "border-status-danger/40 bg-linear-to-r from-status-danger/10 to-status-danger/10 [&_[data-slot=toast-icon]]:text-status-danger",
};

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const tone = toast.tone ?? "neutral";
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (hovered || focused) return;
    const timer = setTimeout(onClose, TOAST_DURATION);
    return () => clearTimeout(timer);
  }, [hovered, focused, onClose]);

  return (
    <div
      tabIndex={-1}
      // danger interrupts; everything else waits for a pause
      role={tone === "danger" ? "alert" : "status"}
      aria-atomic="true"
      // plain cards stay white in dark mode too, as in the design system
      data-theme={tone === "danger" || tone === "success" ? undefined : "light"}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      className={`rounded-ds-lg bg-popover text-fg shadow-elevation-md pointer-events-auto flex w-full items-start gap-3 overflow-hidden border p-4 font-sans text-sm outline-none motion-safe:animate-[n-rise-in_250ms_cubic-bezier(0.4,0,0.2,1)] sm:w-[356px] ${TONES[tone]}`}
    >
      <span data-slot="toast-icon" className="flex h-lh shrink-0 items-center [&_svg]:size-4">
        {ICONS[tone]}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="font-medium">{toast.title}</div>
        {(toast.description || toast.action) && (
          <div className="text-text-muted [word-spacing:0.1em]">
            {toast.description}
            {toast.action && (
              <>
                {toast.description && " "}
                {/* inline link, as Conductor's toasts do ("Open error panel to inspect") */}
                <button
                  type="button"
                  onClick={() => {
                    toast.action!.onClick();
                    onClose();
                  }}
                  className={toastLinkClass}
                >
                  {toast.action.label}
                </button>
              </>
            )}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss notification"
        className="rounded-ds-md text-text-muted hover:bg-secondary active:bg-secondary-hover focus-visible:ring-ring -my-1 -mr-1 inline-flex size-6 shrink-0 cursor-pointer items-center justify-center outline-none focus-visible:ring-[3px] [&_svg]:size-4"
      >
        <svg {...iconProps}>
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
