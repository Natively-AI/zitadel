import { useTranslations } from "next-intl";
import Link from "next/link";
import { buttonClassName, Heading } from "./ui";

// NativelyAI fork: shown instead of the code form when this browser has no login session,
// e.g. the email's link was opened in another browser, or the session timed out.

export function SessionExpired({ restartHref }: { restartHref: string }) {
  const t = useTranslations("natively.code.expired");
  return (
    <>
      <Heading title={t("title")} subtitle={t("body")} />
      <Link href={restartHref} className={buttonClassName()} data-testid="code-start-again">
        {t("startAgain")}
      </Link>
    </>
  );
}
