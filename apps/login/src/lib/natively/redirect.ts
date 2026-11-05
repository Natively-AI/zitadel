import { redirect } from "next/navigation";
import { isEmailCodeLoginEnabled } from "./config";

/**
 * NativelyAI fork: sends a stock page (loginname, register, IdP failure, logout done) to its
 * email-code equivalent when EMAIL_CODE_LOGIN is on. Does nothing when it is off.
 * Keeps requestId and organization so the OIDC flow continues.
 */
export function redirectToEmailCodeLogin(
  searchParams: Record<string | number | symbol, string | undefined>,
  { path = "/email", extra = {} }: { path?: string; extra?: Record<string, string> } = {},
) {
  if (!isEmailCodeLoginEnabled()) {
    return;
  }
  const params = new URLSearchParams();
  for (const key of ["requestId", "organization"] as const) {
    const value = searchParams[key];
    if (typeof value === "string" && value) {
      params.set(key, value);
    }
  }
  const email = searchParams.loginName ?? searchParams.email;
  if (path === "/email" && typeof email === "string" && email) {
    params.set("email", email);
  }
  for (const [key, value] of Object.entries(extra)) {
    params.set(key, value);
  }
  const query = params.toString();
  redirect(query ? `${path}?${query}` : path);
}
