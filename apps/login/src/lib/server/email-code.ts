"use server";

/**
 * NativelyAI fork: server actions for the email-code login
 * (email → one-time code → done, no password).
 *
 * Built only from the public Zitadel v2 APIs the stock login app already uses:
 * - the code is a session OTP Email challenge, sent by Zitadel itself;
 * - entering it adds a verified `otpEmail` check to the session;
 * - `isSessionValid` (src/lib/session.ts) accepts that check as a full login while
 *   EMAIL_CODE_LOGIN is on.
 *
 * Errors are returned as keys (see EmailCodeError) and translated in the UI under the
 * `natively.errors` namespace.
 */

import { completeFlowOrGetUrl } from "@/lib/client";
import { getSessionCookieById } from "@/lib/cookies";
import { createLogger } from "@/lib/logger";
import { isEmailCodeLoginEnabled } from "@/lib/natively/config";
import { createSessionAndUpdateCookie, setSessionAndUpdateCookie } from "@/lib/server/cookie";
import { getPublicHost } from "@/lib/server/host";
import { getServiceConfig } from "@/lib/service-url";
import {
  addHuman,
  addOTPEmail,
  getDefaultOrg,
  getLoginSettings,
  listAuthenticationMethodTypes,
  listUsers,
  ServiceConfig,
} from "@/lib/zitadel";
import { create, Duration } from "@zitadel/client";
import { OrganizationSchema } from "@zitadel/proto/zitadel/object/v2/object_pb";
import { RequestChallenges, RequestChallengesSchema } from "@zitadel/proto/zitadel/session/v2/challenge_pb";
import { ChecksSchema } from "@zitadel/proto/zitadel/session/v2/session_service_pb";
import { UserState } from "@zitadel/proto/zitadel/user/v2/user_pb";
import { AddHumanUserRequestSchema, AuthenticationMethodType } from "@zitadel/proto/zitadel/user/v2/user_service_pb";
import { headers } from "next/headers";

const logger = createLogger("email-code");

export type EmailCodeError =
  | "invalidEmail"
  | "nameRequired"
  | "cannotReceiveCodes"
  | "registrationDisabled"
  | "accountUnavailable"
  | "wrongCode"
  | "expiredCode"
  | "tooManyAttempts"
  | "sessionExpired"
  | "generic";

export type EmailCodeResult =
  { redirect: string } | { samlData: { url: string; fields: Record<string, string> } } | { error: EmailCodeError };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const MAX_NAME_LENGTH = 200;
const DEFAULT_SESSION_LIFETIME: Duration = { seconds: BigInt(24 * 60 * 60), nanos: 0 } as Duration;

function normaliseEmail(email: unknown): string | undefined {
  if (typeof email !== "string") {
    return undefined;
  }
  const value = email.trim().toLowerCase();
  if (!value || value.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(value)) {
    return undefined;
  }
  return value;
}

function normaliseName(name: unknown): string | undefined {
  if (typeof name !== "string") {
    return undefined;
  }
  const value = name.trim();
  return value && value.length <= MAX_NAME_LENGTH ? value : undefined;
}

/** Maps a Zitadel API error to the screen the user should see. */
function toErrorKey(error: unknown): EmailCodeError {
  // setSessionAndUpdateCookie rethrows failed credential checks as { error, failedAttempts }
  if (error && typeof error === "object" && "failedAttempts" in error) {
    return "wrongCode";
  }

  const message =
    error instanceof Error
      ? error.message
      : error && typeof error === "object" && "error" in error
        ? String((error as { error: unknown }).error)
        : String(error);

  // Match both the i18n key and the error ID: the message text is translated by Zitadel,
  // the ID in brackets is not.
  if (/Errors\.User\.Locked|COMMAND-S6h4R/.test(message)) return "tooManyAttempts";
  if (/Errors\.User\.Code\.Expired|CODE-QvUQ4P/.test(message)) return "expiredCode";
  if (/Errors\.User\.Code\.NotFound|COMMAND-S34gh|COMMAND-G3t31/.test(message)) return "expiredCode";
  if (/Errors\.User\.Code\.Invalid|CODE-woT0xc/.test(message)) return "wrongCode";
  if (/Errors\.User\.MFA\.OTP\.NotReady/.test(message)) return "cannotReceiveCodes";
  if (/Errors\.User\.NotActive/.test(message)) return "accountUnavailable";

  return "generic";
}

function buildParams(values: Record<string, string | undefined>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value) {
      params.set(key, value);
    }
  }
  return params;
}

/** The link in the email opens the code screen with the code filled in (never auto-submitted). */
function otpEmailChallenge(host: string | null, requestId?: string): RequestChallenges {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const urlTemplate = host
    ? `${host.includes("localhost") ? "http://" : "https://"}${host}${basePath}/email/code?code={{.Code}}&sessionId={{.SessionID}}` +
      (requestId ? `&requestId=${encodeURIComponent(requestId)}` : "")
    : undefined;

  return create(RequestChallengesSchema, {
    otpEmail: {
      deliveryType: { case: "sendCode", value: urlTemplate ? { urlTemplate } : {} },
    },
  });
}

async function getContext() {
  const _headers = await headers();
  const { serviceConfig } = getServiceConfig(_headers);
  const host = getPublicHost(_headers);
  return { serviceConfig, host };
}

/** Email codes only work once the user has the OTP Email factor, which needs a verified email. */
async function ensureEmailCodeFactor(serviceConfig: ServiceConfig, userId: string) {
  const methods = await listAuthenticationMethodTypes({ serviceConfig, userId });
  if (methods.authMethodTypes?.includes(AuthenticationMethodType.OTP_EMAIL)) {
    return;
  }
  await addOTPEmail({ serviceConfig, userId }).catch((error) => {
    // a parallel request may have added it in the meantime
    if (!String(error?.message).includes("Errors.User.MFA.OTP.AlreadyReady")) {
      throw error;
    }
  });
}

/** Creates a session for the user, has Zitadel email the code and returns the code screen. */
async function sendCodeForUser(
  serviceConfig: ServiceConfig,
  host: string | null,
  userId: string,
  requestId?: string,
  organization?: string,
): Promise<EmailCodeResult> {
  await ensureEmailCodeFactor(serviceConfig, userId);

  const { session } = await createSessionAndUpdateCookie({
    checks: create(ChecksSchema, { user: { search: { case: "userId", value: userId } } }),
    challenges: otpEmailChallenge(host, requestId),
    requestId,
    lifetime: DEFAULT_SESSION_LIFETIME,
  });

  return {
    redirect: "/email/code?" + buildParams({ sessionId: session.id, requestId, organization }),
  };
}

export async function startEmailCodeLogin(command: {
  email: string;
  requestId?: string;
  organization?: string;
}): Promise<EmailCodeResult> {
  if (!isEmailCodeLoginEnabled()) {
    return { error: "generic" };
  }

  const email = normaliseEmail(command.email);
  if (!email) {
    return { error: "invalidEmail" };
  }

  const { serviceConfig, host } = await getContext();

  try {
    const users = await listUsers({ serviceConfig, email, organizationId: command.organization });
    const found = users.result ?? [];

    if (found.length > 1) {
      logger.warn("More than one user has this email; cannot pick one");
      return { error: "accountUnavailable" };
    }

    // Unknown email: collect a name first, Zitadel needs first and last name (BP-1084).
    if (found.length === 0) {
      const organization = command.organization ?? (await getDefaultOrg({ serviceConfig }))?.id;
      const loginSettings = await getLoginSettings({ serviceConfig, organization });
      if (!loginSettings?.allowRegister) {
        return { error: "registrationDisabled" };
      }
      return {
        redirect: "/email/new?" + buildParams({ email, requestId: command.requestId, organization: command.organization }),
      };
    }

    const user = found[0];
    const human = user.type.case === "human" ? user.type.value : undefined;

    if (user.state === UserState.LOCKED) {
      return { error: "tooManyAttempts" };
    }
    if (user.state === UserState.INACTIVE) {
      return { error: "accountUnavailable" };
    }
    if (!human?.email?.isVerified) {
      // Without a verified email Zitadel won't add the OTP Email factor.
      return { error: "cannotReceiveCodes" };
    }

    return await sendCodeForUser(
      serviceConfig,
      host,
      user.userId,
      command.requestId,
      command.organization ?? user.details?.resourceOwner,
    );
  } catch (error) {
    logger.error("Could not start email code login", { error });
    return { error: toErrorKey(error) };
  }
}

export async function registerEmailCodeUser(command: {
  email: string;
  firstName: string;
  lastName: string;
  requestId?: string;
  organization?: string;
}): Promise<EmailCodeResult> {
  if (!isEmailCodeLoginEnabled()) {
    return { error: "generic" };
  }

  const email = normaliseEmail(command.email);
  if (!email) {
    return { error: "invalidEmail" };
  }
  const firstName = normaliseName(command.firstName);
  const lastName = normaliseName(command.lastName);
  if (!firstName || !lastName) {
    return { error: "nameRequired" };
  }

  const { serviceConfig, host } = await getContext();

  try {
    // The account may have been created in another tab since the email was checked.
    const existing = await listUsers({ serviceConfig, email, organizationId: command.organization });
    if ((existing.result ?? []).length > 0) {
      return startEmailCodeLogin({ email, requestId: command.requestId, organization: command.organization });
    }

    const organization = command.organization ?? (await getDefaultOrg({ serviceConfig }))?.id;
    const loginSettings = await getLoginSettings({ serviceConfig, organization });
    if (!loginSettings?.allowRegister) {
      return { error: "registrationDisabled" };
    }

    // The email is stored as verified so the OTP Email factor can be added. This grants no
    // access: logging in still needs the code sent to that inbox, which proves ownership.
    const created = await addHuman({
      serviceConfig,
      request: create(AddHumanUserRequestSchema, {
        username: email,
        email: { email, verification: { case: "isVerified", value: true } },
        profile: { givenName: firstName, familyName: lastName },
        organization: organization ? create(OrganizationSchema, { org: { case: "orgId", value: organization } }) : undefined,
      }),
    });

    return await sendCodeForUser(serviceConfig, host, created.userId, command.requestId, command.organization);
  } catch (error) {
    logger.error("Could not register email code user", { error });
    return { error: toErrorKey(error) };
  }
}

export async function resendLoginCode(command: {
  sessionId: string;
  requestId?: string;
}): Promise<{ error?: EmailCodeError }> {
  if (!isEmailCodeLoginEnabled()) {
    return { error: "generic" };
  }

  const cookie = await getSessionCookieById({ sessionId: command.sessionId });
  if (!cookie) {
    return { error: "sessionExpired" };
  }

  const { host } = await getContext();

  try {
    await setSessionAndUpdateCookie({
      recentCookie: cookie,
      challenges: otpEmailChallenge(host, command.requestId),
      requestId: command.requestId,
      lifetime: DEFAULT_SESSION_LIFETIME,
    });
    return {};
  } catch (error) {
    logger.warn("Could not resend login code", { error });
    return { error: toErrorKey(error) };
  }
}

export async function verifyLoginCode(command: {
  sessionId: string;
  code: string;
  requestId?: string;
}): Promise<{ error?: EmailCodeError }> {
  if (!isEmailCodeLoginEnabled()) {
    return { error: "generic" };
  }

  const code = typeof command.code === "string" ? command.code.replace(/\s/g, "") : "";
  if (!/^\d{4,12}$/.test(code)) {
    return { error: "wrongCode" };
  }

  const cookie = await getSessionCookieById({ sessionId: command.sessionId });
  if (!cookie) {
    return { error: "sessionExpired" };
  }

  const { serviceConfig } = await getContext();
  const loginSettings = await getLoginSettings({ serviceConfig, organization: cookie.organization });
  const lifetime = loginSettings?.secondFactorCheckLifetime?.seconds
    ? loginSettings.secondFactorCheckLifetime
    : DEFAULT_SESSION_LIFETIME;

  try {
    await setSessionAndUpdateCookie({
      recentCookie: cookie,
      checks: create(ChecksSchema, { otpEmail: { code } }),
      requestId: command.requestId,
      lifetime,
    });
    return {};
  } catch (error) {
    const key = toErrorKey(error);
    if (key === "generic") {
      logger.error("Could not verify login code", { error });
    }
    return { error: key };
  }
}

/** Sends the verified session back to the app (OIDC/SAML callback) or the default redirect. */
export async function finishEmailCodeLogin(command: { sessionId: string; requestId?: string }): Promise<EmailCodeResult> {
  const cookie = await getSessionCookieById({ sessionId: command.sessionId });
  if (!cookie) {
    return { error: "sessionExpired" };
  }

  const { serviceConfig } = await getContext();
  const loginSettings = await getLoginSettings({ serviceConfig, organization: cookie.organization });

  try {
    const result = await completeFlowOrGetUrl(
      command.requestId
        ? { sessionId: cookie.id, requestId: command.requestId, organization: cookie.organization }
        : { loginName: cookie.loginName, organization: cookie.organization },
      loginSettings?.defaultRedirectUri,
    );
    if ("error" in result) {
      logger.error("Could not finish email code login", { error: result.error });
      return { error: "generic" };
    }
    return result;
  } catch (error) {
    logger.error("Could not finish email code login", { error });
    return { error: "generic" };
  }
}
