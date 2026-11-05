"use client";

// NativelyAI fork: generic "Something went wrong" with retry, for any unexpected error on
// the email-code screens (e.g. Zitadel unreachable).

import { ErrorToastOnMount } from "@/components/natively/error-toast";
import { AuthShell, Button, Heading } from "@/components/natively/ui";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

export default function EmailError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("natively");

  useEffect(() => {
    console.error("[email-code] page error", error.digest ?? error.message);
  }, [error]);

  return (
    <AuthShell>
      <ErrorToastOnMount error="generic" />
      <Heading title={t("errors.generic.title")} />
      <Button onClick={reset}>{t("errors.retry")}</Button>
    </AuthShell>
  );
}
