"use client";

// NativelyAI fork: screen 2 "Enter code" and screen 4 "Signing you in…".

import { handleServerActionResponse } from "@/lib/client-utils";
import { type EmailCodeError, finishEmailCodeLogin, resendLoginCode, verifyLoginCode } from "@/lib/server/email-code";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SubmitEvent, useEffect, useRef, useState } from "react";
import { AutoSubmitForm } from "../auto-submit-form";
import { useAutoFocus } from "./auto-focus";
import { useErrorToast } from "./error-toast";
import { useToast } from "./toast";
import { Button, Heading, Spinner } from "./ui";

// Every error is a toast. These three also change the form: a wrong code turns the box red,
// and the two that lock the screen offer "Start again" in their toast.
type FormError = Extract<EmailCodeError, "wrongCode" | "tooManyAttempts" | "sessionExpired">;
function isFormError(error: EmailCodeError): error is FormError {
  return error === "wrongCode" || error === "tooManyAttempts" || error === "sessionExpired";
}

// The /login endpoint reads the session from a projection that can lag a moment behind
// the code check; the stock OTP screen waits 2s for the same reason.
const PROJECTION_DELAY_MS = 1500;

// The design preview has no Zitadel behind it: this code is accepted, any other is wrong.
export const PREVIEW_CODE = "123456";

function formatSeconds(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function SigningIn() {
  const t = useTranslations("natively.signingIn");
  return (
    <div className="flex flex-col items-center py-10 text-center" role="status" aria-live="polite">
      <Spinner className="text-brand-text h-6 w-6" />
      <p className="font-display text-fg mt-4 text-lg font-semibold">{t("title")}</p>
      <p className="text-fg-muted mt-1 text-sm">{t("body")}</p>
    </div>
  );
}

export function CodeForm({
  sessionId,
  requestId,
  email,
  codeLength,
  cooldownSeconds,
  initialCode,
  differentEmailHref,
  initialError,
  preview = false,
}: {
  sessionId: string;
  requestId?: string;
  email: string;
  codeLength: number;
  cooldownSeconds: number;
  initialCode?: string;
  differentEmailHref: string;
  initialError?: EmailCodeError;
  /** design preview: no server calls, PREVIEW_CODE is the only right code */
  preview?: boolean;
}) {
  const t = useTranslations("natively");
  const autoFocus = useAutoFocus();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [code, setCode] = useState((initialCode ?? "").replace(/\D/g, "").slice(0, codeLength));
  const [phase, setPhase] = useState<"enter" | "verifying" | "signingIn">("enter");
  const toast = useToast();
  const showErrorToast = useErrorToast();
  const [error, setError] = useState<FormError | undefined>(
    initialError && isFormError(initialError) ? initialError : undefined,
  );
  const [cooldown, setCooldown] = useState(cooldownSeconds);
  const [resending, setResending] = useState(false);
  const [samlData, setSamlData] = useState<{ url: string; fields: Record<string, string> } | null>(null);

  useEffect(() => {
    if (initialError) toastFor(initialError, () => inputRef.current?.focus());
    // only for the error the page was opened with
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const locked = error === "tooManyAttempts" || error === "sessionExpired";

  function toastFor(failure: EmailCodeError, retry?: () => void) {
    if (failure === "tooManyAttempts") {
      showErrorToast(failure, {
        action: { label: t("code.startAgain"), onClick: () => router.push(differentEmailHref) },
      });
    } else if (failure === "sessionExpired") {
      // its message already starts with "Start again", which becomes the link
      showErrorToast(failure, { restartHref: differentEmailHref });
    } else if (failure === "generic" && retry) {
      showErrorToast(failure, { retry });
    } else {
      showErrorToast(failure);
    }
  }

  function fail(failure: EmailCodeError, retry?: () => void) {
    setError(isFormError(failure) ? failure : undefined);
    toastFor(failure, retry);
  }

  async function verify(value: string) {
    if (value.length !== codeLength || phase !== "enter" || locked) return;
    setPhase("verifying");
    setError(undefined);
    toast.dismiss("error");

    const result: { error?: EmailCodeError } = preview
      ? await new Promise((resolve) => setTimeout(() => resolve(value === PREVIEW_CODE ? {} : { error: "wrongCode" }), 600))
      : await verifyLoginCode({ sessionId, code: value, requestId }).catch(() => ({
          error: "generic" as const,
        }));

    if (result.error) {
      fail(result.error, () => void verify(value));
      setPhase("enter");
      if (result.error === "wrongCode") {
        setCode("");
        inputRef.current?.focus();
      }
      return;
    }

    setPhase("signingIn");
    if (preview) return;
    await new Promise((resolve) => setTimeout(resolve, PROJECTION_DELAY_MS));

    const finished = await finishEmailCodeLogin({ sessionId, requestId }).catch(() => ({ error: "generic" as const }));
    if ("error" in finished) {
      fail(finished.error, () => void verify(value));
      setPhase("enter");
      return;
    }
    handleServerActionResponse(finished, router, setSamlData, () => {
      fail("generic");
      setPhase("enter");
    });
  }

  async function resend() {
    setResending(true);
    setError(undefined);
    const result: { error?: EmailCodeError } = preview
      ? {}
      : await resendLoginCode({ sessionId, requestId }).catch(() => ({ error: "generic" as const }));
    setResending(false);
    if (result.error) {
      fail(result.error, () => void resend());
      return;
    }
    setCode("");
    toast.dismiss("error");
    toast.show({ id: "resent", tone: "success", title: t("code.resent", { email }) });
    setCooldown(cooldownSeconds);
    inputRef.current?.focus();
  }

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    void verify(code);
  }

  if (phase === "signingIn") {
    return (
      <>
        {samlData && <AutoSubmitForm url={samlData.url} fields={samlData.fields} />}
        <SigningIn />
      </>
    );
  }

  const resendLabel =
    cooldown > 0
      ? t("code.resendIn", { time: formatSeconds(cooldown) })
      : resending
        ? t("code.resending")
        : t("code.resend");

  return (
    <div className="flex flex-col">
      <Heading
        title={t("code.title")}
        subtitle={t.rich("code.subtitle", {
          email,
          strong: (chunks) => <span className="text-fg font-medium break-all">{chunks}</span>,
        })}
      />

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label htmlFor="code" className="sr-only">
          {t("code.label")}
        </label>
        {/* the box is drawn by this wrapper so the input inside can be just as wide as the code */}
        <div
          className={`rounded-ds-lg bg-input focus-within:ring-ring/50 flex h-11 w-full cursor-text justify-center border focus-within:ring-[3px] ${
            error === "wrongCode" ? "border-danger" : "border-line-input focus-within:border-ring"
          } ${locked ? "opacity-50" : ""}`}
          onClick={() => inputRef.current?.focus()}
        >
          <input
            ref={inputRef}
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern={`\\d{${codeLength}}`}
            maxLength={codeLength}
            autoFocus={autoFocus}
            disabled={locked}
            placeholder={"•".repeat(codeLength)}
            value={code}
            aria-invalid={error === "wrongCode" || undefined}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, codeLength);
              setCode(digits);
              if (error === "wrongCode") {
                setError(undefined);
                toast.dismiss("error");
              }
              // submit as soon as the last digit is typed or a code is pasted
              if (digits.length === codeLength) void verify(digits);
            }}
            // exactly as wide as the code, so the dots sit in the middle and the cursor starts at
            // the first one; the left margin balances the letter-spacing after the last digit
            style={{ width: `calc(${codeLength}ch + ${codeLength} * 0.5em)` }}
            className="text-fg placeholder:text-fg-subtle/60 ml-[0.5em] h-full bg-transparent text-left font-mono text-xl tracking-[0.5em] outline-none"
            data-testid="code-input"
          />
        </div>

        <Button
          type="submit"
          loading={phase === "verifying"}
          disabled={code.length !== codeLength || locked}
          data-testid="code-verify"
        >
          {phase === "verifying" ? t("code.verifying") : t("code.verify")}
        </Button>
      </form>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
        <Button
          variant="link"
          className="tabular-nums"
          onClick={resend}
          disabled={cooldown > 0 || resending || locked}
          data-testid="code-resend"
        >
          {resendLabel}
        </Button>
        <Link
          href={differentEmailHref}
          className="text-fg-muted hover:text-fg font-medium underline-offset-4 hover:underline"
          data-testid="code-different-email"
        >
          {t("code.differentEmail")}
        </Link>
      </div>

      <p className="text-fg-subtle mt-8 text-center text-xs leading-4">{t("code.spamHint")}</p>
    </div>
  );
}
