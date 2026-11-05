// NativelyAI fork: small UI primitives for the email-code login, styled after
// @natively-ai/design-system (see src/styles/natively.css). No hooks, so they work in both
// server and client components.

import React from "react";
import { BrandPanel, BrandPanelFooter } from "./brand-panel";
import { ThemeToggle } from "./theme-toggle";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/**
 * The NativelyAI logo, as served at https://nativelyai.com/nativelyai.svg: a white tile with
 * a black mark on dark backgrounds, inverted on light ones.
 */
export function NativelyMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className={cx("shrink-0", className)}>
      <path
        d="M24.932 0H7.06797C3.16444 0 0 3.16444 0 7.06797V24.932C0 28.8356 3.16444 32 7.06797 32H24.932C28.8356 32 32 28.8356 32 24.932V7.06797C32 3.16444 28.8356 0 24.932 0Z"
        className="fill-logo-tile"
      />
      <path
        d="M14.8116 22H5.94581C4.59502 22 3.65638 20.6623 4.11979 19.4011L7.05939 11.4157C7.37241 10.5654 8.18591 10 9.09627 10H15.0325C15.699 10 16.3202 10.3413 16.6771 10.9023L20.1655 16.3981C20.4297 16.814 21.0568 16.7492 21.2303 16.2903L23.6105 10H28L23.9951 20.7388C23.7131 21.4979 22.9854 22 22.173 22H19.3334C18.6648 22 18.0417 21.6587 17.6868 21.0938L12.1634 12.3459C11.8991 11.9281 11.2701 11.9928 11.0965 12.4557L8.67104 18.9735C8.52709 19.3619 8.81499 19.7738 9.23107 19.7738H13.3859L14.8097 22H14.8116Z"
        className="fill-logo-mark"
      />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cx("text-fg flex items-center gap-2", className)}>
      <NativelyMark className="h-6 w-6" />
      <span className="font-display text-base font-semibold tracking-tight">NativelyAI</span>
    </div>
  );
}

/**
 * Page frame. One column up to 1024px wide (popup ~480px, phones, in-app browsers); wider,
 * a brand panel sits on the left, as in the options-doc mockup. Uses container queries, so
 * the design preview can render it in a fixed-size box (`contained`).
 */
export function AuthShell({ children, contained = false }: { children: React.ReactNode; contained?: boolean }) {
  return (
    <div className={cx("@container w-full", contained ? "h-full" : "min-h-dvh min-h-screen")}>
      <main className={cx("flex w-full", contained ? "min-h-full" : "min-h-dvh min-h-screen")}>
        <aside className="border-line bg-raised hidden w-[44%] max-w-[560px] flex-col justify-between border-r p-10 @5xl:flex">
          <Wordmark />
          <BrandPanel />
          <BrandPanelFooter />
        </aside>
        {/* The logo stays at the top of the column; my-auto centres the form below it. If the
            form is taller than the window (phone with the keyboard open) it scrolls instead. */}
        <section className="relative flex flex-1 flex-col px-4 py-6 @xl:px-6 @xl:py-10">
          <ThemeToggle className="absolute top-4 right-4 @xl:top-6 @xl:right-6" />
          <Wordmark className="mx-auto mb-6 w-full max-w-[300px] @5xl:hidden" />
          <div className="mx-auto my-auto w-full max-w-[300px] @5xl:max-w-[360px]">{children}</div>
        </section>
      </main>
    </div>
  );
}

export function Heading({ title, subtitle }: { title: React.ReactNode; subtitle?: React.ReactNode }) {
  return (
    <header className="mb-8 text-center @5xl:mb-9">
      <h1 className="font-display text-fg text-2xl leading-8 font-semibold @5xl:text-[1.75rem] @5xl:leading-9">{title}</h1>
      {subtitle && <p className="text-fg-muted mt-2 text-sm leading-5 @5xl:text-[0.9375rem] @5xl:leading-6">{subtitle}</p>}
    </header>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={cx("h-4 w-4 animate-spin", className)}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity={0.25} strokeWidth={3} />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
    </svg>
  );
}

type ButtonProps = React.ComponentProps<"button"> & {
  variant?: "primary" | "secondary" | "link";
  loading?: boolean;
};

const buttonBase =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-ds-md text-sm font-medium @5xl:text-[0.9375rem] whitespace-nowrap outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring disabled:cursor-default motion-reduce:transition-none";

const buttonVariants = {
  primary:
    "h-9 w-full @5xl:h-10 bg-brand px-4 text-white hover:bg-brand-hover active:bg-brand-active disabled:not-aria-busy:opacity-40 aria-busy:cursor-wait disabled:hover:bg-brand",
  secondary:
    "h-9 w-full @5xl:h-10 border border-line bg-transparent px-4 text-fg hover:bg-secondary active:bg-secondary-hover disabled:not-aria-busy:opacity-40 aria-busy:cursor-wait disabled:hover:bg-transparent",
  link: "h-auto px-0 text-brand-text underline-offset-4 hover:underline disabled:text-fg-muted disabled:opacity-50 disabled:no-underline",
};

/** Button styles for a link that looks like a button (e.g. a <Link>). */
export function buttonClassName(variant: keyof typeof buttonVariants = "primary") {
  return cx(buttonBase, buttonVariants[variant]);
}

export function Button({ variant = "primary", loading, className, children, disabled, type, ...props }: ButtonProps) {
  return (
    <button
      type={type ?? "button"}
      className={cx(buttonBase, buttonVariants[variant], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

type TextFieldProps = React.ComponentProps<"input"> & {
  label: string;
  error?: string;
  hideLabel?: boolean;
};

export function TextField({ label, error, hideLabel, id, className, ...props }: TextFieldProps) {
  const inputId = id ?? `field-${props.name}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className={cx("text-fg text-sm font-medium", hideLabel && "sr-only")}>
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        // 16px stops iOS Safari and in-app browsers from zooming into the field
        className={cx(
          "rounded-ds-md border-line-input bg-input text-fg placeholder:text-fg-subtle focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-danger h-9 w-full border px-3 text-base outline-none focus-visible:ring-[3px] sm:@max-5xl:text-sm @5xl:h-10 @5xl:text-[0.9375rem]",
          className,
        )}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="text-danger text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

export function Divider({ label }: { label: string }) {
  return (
    <div className="text-fg-subtle my-6 flex items-center gap-3 text-xs @5xl:my-7" role="separator">
      <span className="bg-line h-px flex-1" />
      {label}
      <span className="bg-line h-px flex-1" />
    </div>
  );
}
