import { CodeForm } from "@/components/natively/code-form";
import { SessionExpired } from "@/components/natively/session-expired";
import { AuthShell } from "@/components/natively/ui";
import { getSessionCookieById } from "@/lib/cookies";
import { getEmailCodeLength, isEmailCodeLoginEnabled, RESEND_COOLDOWN_SECONDS } from "@/lib/natively/config";
import { getServiceConfig } from "@/lib/service-url";
import { loadSession } from "@/lib/session";
import { getUserByID } from "@/lib/zitadel";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

// NativelyAI fork: screen 2, "Enter code" (screen 4 "Signing you in…" is its last state).

type SearchParams = Record<string, string | undefined>;

export default async function Page(props: { searchParams: Promise<SearchParams> }) {
  if (!isEmailCodeLoginEnabled()) {
    notFound();
  }

  const { sessionId, requestId, organization, code } = await props.searchParams;

  const startParams = new URLSearchParams();
  if (requestId) startParams.set("requestId", requestId);
  if (organization) startParams.set("organization", organization);
  const differentEmailHref = "/email?" + startParams;

  const _headers = await headers();
  const { serviceConfig } = getServiceConfig(_headers);

  // The session lives in this browser's cookie. An email link opened in another browser
  // (or after the session expired) has none, so the user starts again.
  const cookie = sessionId ? await getSessionCookieById({ sessionId }) : undefined;
  const session = cookie ? await loadSession(serviceConfig, cookie) : undefined;

  if (!session?.factors?.user?.id) {
    return (
      <AuthShell>
        <SessionExpired restartHref={differentEmailHref} />
      </AuthShell>
    );
  }

  const user = await getUserByID({ serviceConfig, userId: session.factors.user.id }).catch(() => undefined);
  const email =
    (user?.user?.type.case === "human" ? user.user.type.value.email?.email : undefined) ??
    session.factors.user.loginName ??
    "";

  return (
    <AuthShell>
      <CodeForm
        sessionId={session.id}
        requestId={requestId}
        email={email}
        codeLength={getEmailCodeLength()}
        // a code was just sent when arriving from the email screen; not when opening the email's link
        cooldownSeconds={code ? 0 : RESEND_COOLDOWN_SECONDS}
        initialCode={code}
        differentEmailHref={differentEmailHref}
      />
    </AuthShell>
  );
}
