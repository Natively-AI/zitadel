import { EmailStartForm } from "@/components/natively/email-start-form";
import { AuthShell, Heading } from "@/components/natively/ui";
import { isEmailCodeLoginEnabled } from "@/lib/natively/config";
import { getServiceConfig } from "@/lib/service-url";
import { getActiveIdentityProviders, getDefaultOrg, getLoginSettings } from "@/lib/zitadel";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

// NativelyAI fork: screen 1, "Log in / sign up". /loginname redirects here.

type SearchParams = Record<string, string | undefined>;

export default async function Page(props: { searchParams: Promise<SearchParams> }) {
  const { email, requestId, organization, error, provider } = await props.searchParams;

  if (!isEmailCodeLoginEnabled()) {
    const params = new URLSearchParams();
    if (requestId) params.set("requestId", requestId);
    if (organization) params.set("organization", organization);
    redirect("/loginname?" + params);
  }

  const t = await getTranslations("natively");
  const _headers = await headers();
  const { serviceConfig } = getServiceConfig(_headers);

  const orgId = organization ?? (await getDefaultOrg({ serviceConfig }))?.id;
  const loginSettings = await getLoginSettings({ serviceConfig, organization: orgId });
  const identityProviders = loginSettings?.allowExternalIdp
    ? await getActiveIdentityProviders({ serviceConfig, orgId }).then((resp) => resp.identityProviders)
    : [];

  return (
    <AuthShell>
      <Heading title={t("start.title")} subtitle={t("start.subtitle")} />
      <EmailStartForm
        defaultEmail={email}
        requestId={requestId}
        organization={organization}
        identityProviders={identityProviders}
        initialError={error === "social" ? "socialFailed" : undefined}
        socialProvider={error === "social" ? provider : undefined}
      />
    </AuthShell>
  );
}
