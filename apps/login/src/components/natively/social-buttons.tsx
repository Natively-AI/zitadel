"use client";

// NativelyAI fork: "Continue with Google / GitHub / X / Apple". Which buttons appear is
// decided in Zitadel (the instance's active identity providers), not in code.

import { idpTypeToSlug } from "@/lib/idp";
import { redirectToIdp, type RedirectToIdpState } from "@/lib/server/idp";
import { IdentityProvider, IdentityProviderType } from "@zitadel/proto/zitadel/settings/v2/login_settings_pb";
import { useTranslations } from "next-intl";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { AutoSubmitForm } from "../auto-submit-form";
import { useErrorToast } from "./error-toast";
import { Button, Spinner } from "./ui";

type Brand = "google" | "github" | "x" | "apple" | "other";

const ORDER: Brand[] = ["google", "github", "x", "apple", "other"];

export function brandOf(idp: Pick<IdentityProvider, "type" | "name">): Brand {
  switch (idp.type) {
    case IdentityProviderType.GOOGLE:
      return "google";
    case IdentityProviderType.GITHUB:
    case IdentityProviderType.GITHUB_ES:
      return "github";
    case IdentityProviderType.APPLE:
      return "apple";
    default:
      // X has no dedicated Zitadel type; it is set up as a generic OAuth provider named "X".
      return /^(x|twitter|x \(twitter\))$/i.test(idp.name.trim()) ? "x" : "other";
  }
}

const BRAND_NAMES: Record<Exclude<Brand, "other">, string> = {
  google: "Google",
  github: "GitHub",
  x: "X",
  apple: "Apple",
};

/** The provider's name as shown to people: "Google", "GitHub", "X", "Apple", or Zitadel's name for it. */
export function providerName(idp: Pick<IdentityProvider, "type" | "name">): string {
  const brand = brandOf(idp);
  return brand === "other" ? idp.name : BRAND_NAMES[brand];
}

export function BrandIcon({ brand }: { brand: Brand }) {
  switch (brand) {
    case "google":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
          <path
            fill="#4285F4"
            d="M22.5 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.9a5.05 5.05 0 0 1-2.19 3.31v2.77h3.55c2.08-1.92 3.24-4.74 3.24-8.09Z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.55-2.77c-.98.66-2.24 1.06-3.73 1.06-2.87 0-5.3-1.94-6.16-4.54H2.18v2.84A11 11 0 0 0 12 23Z"
          />
          <path fill="#FBBC05" d="M5.84 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84Z" />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.96 10.96 0 0 0 12 1 11 11 0 0 0 2.18 7.07l3.66 2.84C6.7 7.31 9.13 5.38 12 5.38Z"
          />
        </svg>
      );
    case "github":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="currentColor">
          <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
        </svg>
      );
    case "x":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="currentColor">
          <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82-5.97 6.82H1.67l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23Zm-1.16 17.52h1.83L7.08 4.13H5.12l11.96 15.64Z" />
        </svg>
      );
    case "apple":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="currentColor">
          <path d="M16.37 12.6c-.02-2.36 1.93-3.5 2.02-3.55a4.35 4.35 0 0 0-3.42-1.85c-1.45-.15-2.84.86-3.58.86-.74 0-1.88-.84-3.09-.82a4.57 4.57 0 0 0-3.87 2.35c-1.65 2.86-.42 7.1 1.19 9.42.79 1.13 1.72 2.4 2.95 2.36 1.18-.05 1.63-.77 3.06-.77 1.43 0 1.83.77 3.08.74 1.27-.02 2.08-1.15 2.86-2.29a10.3 10.3 0 0 0 1.3-2.66 4.13 4.13 0 0 1-2.5-3.79ZM14 5.66A4.12 4.12 0 0 0 14.97 2.7a4.2 4.2 0 0 0-2.72 1.4 3.93 3.93 0 0 0-.99 2.86A3.47 3.47 0 0 0 14 5.66Z" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
        </svg>
      );
  }
}

// If Zitadel can't be reached (or the preview, which has no Zitadel), redirectToIdp throws
// instead of returning an error. Without this the throw takes down the whole page; with it the
// user gets the "social login failed" toast and can try again.
// It also remembers which provider was clicked, so the toast can name it.
type SocialLoginState = RedirectToIdpState & { idpId?: string };

async function startIdpLogin(prevState: SocialLoginState, formData: FormData): Promise<SocialLoginState> {
  const idpId = String(formData.get("id") ?? "");
  try {
    const result = await redirectToIdp(prevState, formData);
    return { ...result, idpId };
  } catch (error) {
    // redirect() works by throwing; let Next.js handle it
    if (
      typeof (error as { digest?: unknown })?.digest === "string" &&
      (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    console.warn("[email-code] social login failed to start", error);
    return { error: "Could not start social login", idpId };
  }
}

function SubmitButton({ brand, label, disabled }: { brand: Brand; label: string; disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" disabled={disabled || pending} data-testid={`idp-${brand}`}>
      {pending ? <Spinner /> : <BrandIcon brand={brand} />}
      {label}
    </Button>
  );
}

export function SocialButtons({
  identityProviders,
  requestId,
  organization,
  disabled = false,
}: {
  identityProviders: IdentityProvider[];
  requestId?: string;
  organization?: string;
  disabled?: boolean;
}) {
  const t = useTranslations("natively");
  const [state, action] = useActionState(startIdpLogin, {});
  const showErrorToast = useErrorToast();

  useEffect(() => {
    if (!state?.error) return;
    const idp = identityProviders.find((candidate) => candidate.id === state.idpId);
    showErrorToast("socialFailed", { provider: idp && providerName(idp) });
    // only when a new result comes in, not when the provider list is re-created
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, showErrorToast]);

  const sorted = [...identityProviders].sort((a, b) => ORDER.indexOf(brandOf(a)) - ORDER.indexOf(brandOf(b)));

  return (
    <div className="flex flex-col gap-2 @5xl:gap-2.5">
      {state?.samlData && <AutoSubmitForm url={state.samlData.url} fields={state.samlData.fields} />}
      {sorted.map((idp) => {
        const brand = brandOf(idp);
        const name = providerName(idp);
        return (
          <form action={action} key={idp.id} className="flex">
            <input type="hidden" name="id" value={idp.id} />
            <input type="hidden" name="provider" value={idpTypeToSlug(idp.type)} />
            {requestId && <input type="hidden" name="requestId" value={requestId} />}
            {organization && <input type="hidden" name="organization" value={organization} />}
            <input type="hidden" name="postErrorRedirectUrl" value="/email" />
            <SubmitButton brand={brand} label={t("start.continueWith", { provider: name })} disabled={disabled} />
          </form>
        );
      })}
    </div>
  );
}
