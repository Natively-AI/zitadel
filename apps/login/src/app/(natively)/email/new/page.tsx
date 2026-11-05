import { NewUserForm } from "@/components/natively/new-user-form";
import { AuthShell } from "@/components/natively/ui";
import { isEmailCodeLoginEnabled } from "@/lib/natively/config";
import { notFound, redirect } from "next/navigation";

// NativelyAI fork: screen 3, "New user details", only for an email without an account.

type SearchParams = Record<string, string | undefined>;

export default async function Page(props: { searchParams: Promise<SearchParams> }) {
  if (!isEmailCodeLoginEnabled()) {
    notFound();
  }

  const { email, requestId, organization } = await props.searchParams;

  const startParams = new URLSearchParams();
  if (requestId) startParams.set("requestId", requestId);
  if (organization) startParams.set("organization", organization);
  const differentEmailHref = "/email?" + startParams;

  if (!email) {
    redirect(differentEmailHref);
  }

  return (
    <AuthShell>
      <NewUserForm email={email} requestId={requestId} organization={organization} differentEmailHref={differentEmailHref} />
    </AuthShell>
  );
}
