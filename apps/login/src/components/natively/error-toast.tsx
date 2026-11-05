"use client";

import type { EmailCodeError } from "@/lib/server/email-code";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect } from "react";
import { type ToastInput, type ToastTone, toastLinkClass, useToast } from "./toast";

type NativelyError = EmailCodeError | "socialFailed";

// Same address Conductor's error modals link to.
const SUPPORT_HREF = "mailto:support@nativelyai.com";

function toneOf(error: NativelyError): ToastTone & ("warning" | "danger") {
  return error === "tooManyAttempts" || error === "expiredCode" ? "warning" : "danger";
}

type ErrorLinks = {
  /** For "socialFailed": the provider's name ("Google"), so the message can say which login failed. */
  provider?: string;
  /** Makes "try again" in the message a link. */
  retry?: () => void;
  /** Makes "Start again" in the message a link. */
  restartHref?: string;
};

/** "socialFailedWith" ("We couldn't log you in with Google") when we know the provider. */
function messageKey(error: NativelyError, provider?: string) {
  return error === "socialFailed" && provider ? "socialFailedWith" : error;
}

/**
 * The message for an error (`natively.errors.<key>.body` in locales/en.json). `<support>` in it
 * links to support; `<retry>` and `<restart>` become links when given, plain text otherwise.
 */
function useErrorBody() {
  const t = useTranslations("natively.errors");
  return useCallback(
    (error: NativelyError, { retry, restartHref, provider }: ErrorLinks = {}) =>
      t.rich(`${messageKey(error, provider)}.body`, {
        provider: provider ?? "",
        support: (chunks) => (
          <a href={SUPPORT_HREF} className={toastLinkClass}>
            {chunks}
          </a>
        ),
        retry: (chunks) =>
          retry ? (
            <button type="button" onClick={retry} className={toastLinkClass}>
              {chunks}
            </button>
          ) : (
            chunks
          ),
        restart: (chunks) =>
          restartHref ? (
            <Link href={restartHref} className={toastLinkClass}>
              {chunks}
            </Link>
          ) : (
            chunks
          ),
      }),
    [t],
  );
}

/**
 * Shows one of the designed error states as a toast. `retry` and `restartHref` turn words in
 * the message into links; `action` adds a link after it.
 */
export function useErrorToast() {
  const t = useTranslations("natively.errors");
  const body = useErrorBody();
  const { show, dismiss } = useToast();
  return useCallback(
    (error: NativelyError, { retry, restartHref, provider, ...options }: Pick<ToastInput, "action"> & ErrorLinks = {}) =>
      show({
        id: "error",
        tone: toneOf(error),
        title: t(`${messageKey(error, provider)}.title`, { provider: provider ?? "" }),
        description: body(error, {
          restartHref,
          provider,
          retry:
            retry &&
            (() => {
              dismiss("error");
              retry();
            }),
        }),
        ...options,
      }),
    [show, dismiss, t, body],
  );
}

/** For a page that is only an error (no form): shows it as a toast once the page opens. */
export function ErrorToastOnMount({ error, restartHref }: { error: NativelyError; restartHref?: string }) {
  const showErrorToast = useErrorToast();
  useEffect(() => {
    showErrorToast(error, { restartHref });
  }, [error, restartHref, showErrorToast]);
  return null;
}
