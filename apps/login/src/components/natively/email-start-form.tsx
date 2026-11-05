"use client";

// NativelyAI fork: screen 1, "Log in / sign up": email, Continue, divider, social buttons.

import { idpTypeToSlug } from "@/lib/idp";
import { type EmailCodeError, startEmailCodeLogin } from "@/lib/server/email-code";
import { IdentityProvider } from "@zitadel/proto/zitadel/settings/v2/login_settings_pb";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { SubmitEvent, useEffect, useState } from "react";
import { useAutoFocus } from "./auto-focus";
import { useErrorToast } from "./error-toast";
import { brandOf, providerName, SocialButtons } from "./social-buttons";
import { useToast } from "./toast";
import { Button, Divider, TextField } from "./ui";

export function EmailStartForm({
  defaultEmail,
  requestId,
  organization,
  identityProviders,
  initialError,
  socialProvider,
}: {
  defaultEmail?: string;
  requestId?: string;
  organization?: string;
  identityProviders: IdentityProvider[];
  initialError?: EmailCodeError | "socialFailed";
  /** For "socialFailed": the provider type from the URL (/idp/google/failure gives "google"). */
  socialProvider?: string;
}) {
  const t = useTranslations("natively");
  // Apple sign-in is hidden for now, even if the provider is active in Zitadel.
  const providers = identityProviders.filter((idp) => brandOf(idp) !== "apple");
  const autoFocus = useAutoFocus();
  const router = useRouter();
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const showErrorToast = useErrorToast();
  // every error is a toast; an invalid email also turns the field red
  const [invalidEmail, setInvalidEmail] = useState(initialError === "invalidEmail");

  useEffect(() => {
    if (initialError === "socialFailed") {
      // Named only if exactly one active provider has that type; X is a generic "oauth"
      // provider, so the name comes from the instance's list, not from the URL.
      const matches = providers.filter((idp) => idpTypeToSlug(idp.type) === socialProvider);
      showErrorToast(initialError, { provider: matches.length === 1 ? providerName(matches[0]) : undefined });
    } else if (initialError) {
      showErrorToast(initialError);
    }
    // only for the error the page was opened with
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function fail(error: EmailCodeError) {
    if (error === "invalidEmail") setInvalidEmail(true);
    showErrorToast(error);
  }

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setInvalidEmail(false);
    toast.dismiss("error");
    try {
      const result = await startEmailCodeLogin({ email, requestId, organization });
      if ("redirect" in result) {
        router.push(result.redirect);
        return; // keep the spinner while the next screen loads
      }
      fail("error" in result ? result.error : "generic");
    } catch {
      fail("generic");
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <TextField
          label={t("start.emailLabel")}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoFocus={autoFocus && !defaultEmail}
          placeholder={t("start.emailPlaceholder")}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (invalidEmail) {
              setInvalidEmail(false);
              toast.dismiss("error");
            }
          }}
          aria-invalid={invalidEmail || undefined}
          required
          data-testid="email-input"
        />
        <Button type="submit" loading={loading} disabled={!email.trim()} data-testid="email-continue">
          {t("start.continue")}
        </Button>
      </form>

      {providers.length > 0 && (
        <>
          <Divider label={t("start.or")} />
          <SocialButtons
            identityProviders={providers}
            requestId={requestId}
            organization={organization}
            disabled={loading}
          />
        </>
      )}
    </div>
  );
}
