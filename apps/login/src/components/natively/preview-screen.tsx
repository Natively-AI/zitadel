import type { PreviewScreen } from "@/lib/natively/preview";
import { create } from "@zitadel/client";
import { IdentityProviderSchema, IdentityProviderType } from "@zitadel/proto/zitadel/settings/v2/login_settings_pb";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import type { ReactNode } from "react";
import { CodeForm, SigningIn } from "./code-form";
import { EmailStartForm } from "./email-start-form";
import { ErrorToastOnMount } from "./error-toast";
import { NewUserForm } from "./new-user-form";
import { SessionExpired } from "./session-expired";
import { AuthShell, Button, buttonClassName, Heading } from "./ui";

// NativelyAI fork: one screen with sample data, for the design preview (/email/preview).
// Development only; buttons don't reach Zitadel.

const SAMPLE_EMAIL = "ada@example.com";

const SAMPLE_IDPS = [
  create(IdentityProviderSchema, { id: "google", name: "Google", type: IdentityProviderType.GOOGLE }),
  create(IdentityProviderSchema, { id: "github", name: "GitHub", type: IdentityProviderType.GITHUB }),
  create(IdentityProviderSchema, { id: "x", name: "X", type: IdentityProviderType.OAUTH }),
  create(IdentityProviderSchema, { id: "apple", name: "Apple", type: IdentityProviderType.APPLE }),
];

export async function PreviewScreenContent({ screen, contained = false }: { screen: PreviewScreen; contained?: boolean }) {
  const t = await getTranslations("natively");

  const start = (initialError?: Parameters<typeof EmailStartForm>[0]["initialError"], socialProvider?: string) => (
    <>
      <Heading title={t("start.title")} subtitle={t("start.subtitle")} />
      <EmailStartForm
        defaultEmail={initialError ? SAMPLE_EMAIL : undefined}
        identityProviders={SAMPLE_IDPS}
        initialError={initialError}
        socialProvider={socialProvider}
      />
    </>
  );

  const code = (initialError?: Parameters<typeof CodeForm>[0]["initialError"]) => (
    <CodeForm
      sessionId="preview"
      email={SAMPLE_EMAIL}
      codeLength={6}
      cooldownSeconds={initialError ? 0 : 30}
      initialCode={initialError === "wrongCode" ? "" : undefined}
      differentEmailHref="/email/preview"
      initialError={initialError}
      preview
    />
  );

  const screens: Record<PreviewScreen, ReactNode> = {
    start: start(),
    "start-social-failed": start("socialFailed", "google"),
    "start-cannot-receive": start("cannotReceiveCodes"),
    "start-registration-disabled": start("registrationDisabled"),
    code: code(),
    "code-wrong": code("wrongCode"),
    "code-expired": code("expiredCode"),
    "code-too-many": code("tooManyAttempts"),
    "code-generic": code("generic"),
    "code-session-expired": <SessionExpired restartHref="/email/preview" />,
    "new-user": <NewUserForm email={SAMPLE_EMAIL} differentEmailHref="/email/preview" />,
    "signing-in": <SigningIn />,
    "page-error": (
      <>
        <ErrorToastOnMount error="generic" />
        <Heading title={t("errors.generic.title")} />
        <Button>{t("errors.retry")}</Button>
      </>
    ),
    "logged-out": (
      <>
        <Heading title={t("loggedOut.title")} subtitle={t("loggedOut.body")} />
        <Link href="/email/preview" className={buttonClassName()}>
          {t("loggedOut.logInAgain")}
        </Link>
      </>
    ),
  };

  return <AuthShell contained={contained}>{screens[screen]}</AuthShell>;
}
