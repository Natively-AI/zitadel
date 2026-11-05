"use client";

// NativelyAI fork: screen 3 "New user details". Zitadel needs a first and last name before
// it creates a user (BP-1084), so an unknown email lands here before the code is sent.

import { registerEmailCodeUser } from "@/lib/server/email-code";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SubmitEvent, useState } from "react";
import { useAutoFocus } from "./auto-focus";
import { useErrorToast } from "./error-toast";
import { useToast } from "./toast";
import { Button, Heading, TextField } from "./ui";

export function NewUserForm({
  email,
  requestId,
  organization,
  differentEmailHref,
}: {
  email: string;
  requestId?: string;
  organization?: string;
  differentEmailHref: string;
}) {
  const t = useTranslations("natively");
  const autoFocus = useAutoFocus();
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const showErrorToast = useErrorToast();

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    toast.dismiss("error");
    try {
      const result = await registerEmailCodeUser({ email, firstName, lastName, requestId, organization });
      if ("redirect" in result) {
        router.push(result.redirect);
        return;
      }
      showErrorToast("error" in result ? result.error : "generic");
    } catch {
      showErrorToast("generic");
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col">
      <Heading
        title={t("newUser.title")}
        subtitle={t.rich("newUser.subtitle", {
          email,
          strong: (chunks) => <span className="text-fg font-medium break-all">{chunks}</span>,
        })}
      />

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 @min-[360px]:grid-cols-2">
          <TextField
            label={t("newUser.firstName")}
            name="firstName"
            autoComplete="given-name"
            autoFocus={autoFocus}
            maxLength={200}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            data-testid="first-name-input"
          />
          <TextField
            label={t("newUser.lastName")}
            name="lastName"
            autoComplete="family-name"
            maxLength={200}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            data-testid="last-name-input"
          />
        </div>
        <Button
          type="submit"
          loading={loading}
          disabled={!firstName.trim() || !lastName.trim()}
          data-testid="new-user-continue"
        >
          {t("newUser.continue")}
        </Button>
      </form>

      <div className="mt-8 text-center text-sm">
        <Link href={differentEmailHref} className="text-fg-muted hover:text-fg hover:underline">
          {t("code.differentEmail")}
        </Link>
      </div>
    </div>
  );
}
