// NativelyAI fork: the design preview at /email/preview (all screens, popup and phone size).

export function isPreviewEnabled(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.NATIVELY_PREVIEW === "true";
}

export const PREVIEW_SCREENS = [
  { id: "start", label: "1. Log in / sign up" },
  { id: "start-social-failed", label: "1. Error: social login cancelled or failed" },
  { id: "start-cannot-receive", label: "1. Error: email can't receive codes" },
  { id: "start-registration-disabled", label: "1. Error: sign-ups closed" },
  { id: "code", label: "2. Enter code" },
  { id: "code-wrong", label: "2. Error: wrong code" },
  { id: "code-expired", label: "2. Error: expired code" },
  { id: "code-too-many", label: "2. Error: too many attempts" },
  { id: "code-generic", label: "2. Error: something went wrong" },
  { id: "code-session-expired", label: "2. Error: link opened in another browser / expired" },
  { id: "new-user", label: "3. New user details" },
  { id: "signing-in", label: "4. Signing you in…" },
  { id: "page-error", label: "5. Error: page failed to load (retry)" },
  { id: "logged-out", label: "6. Logged out" },
] as const;

export type PreviewScreen = (typeof PREVIEW_SCREENS)[number]["id"];
