import { AuthShell, buttonClassName, Heading } from "@/components/natively/ui";
import { isEmailCodeLoginEnabled } from "@/lib/natively/config";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";

// NativelyAI fork: screen 6, "Logged out". Only shown when a logout has no return URL;
// most logouts go straight back to the Builder. /logout/done redirects here.

export default async function Page(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (!isEmailCodeLoginEnabled()) {
    notFound();
  }
  const { organization } = await props.searchParams;
  const t = await getTranslations("natively");

  return (
    <AuthShell>
      <Heading title={t("loggedOut.title")} subtitle={t("loggedOut.body")} />
      <Link
        href={"/email" + (organization ? `?organization=${encodeURIComponent(organization)}` : "")}
        className={buttonClassName()}
      >
        {t("loggedOut.logInAgain")}
      </Link>
    </AuthShell>
  );
}
