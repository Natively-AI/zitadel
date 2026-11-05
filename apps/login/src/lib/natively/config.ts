/**
 * NativelyAI fork: switches for the email-code login.
 *
 * Everything Natively-specific in this app is gated behind EMAIL_CODE_LOGIN so the stock
 * Zitadel login keeps working (and its tests keep passing) when the switch is off. Both
 * values are read at runtime on the server, so they can be set on the Cloud Run service
 * without rebuilding the image.
 */

/** When "true", login is email → one-time code → done, with no password. */
export function isEmailCodeLoginEnabled(): boolean {
  return process.env.EMAIL_CODE_LOGIN === "true";
}

/**
 * Number of digits in the emailed code. It must match the instance's OTP Email secret
 * generator (Zitadel defaults to 8; set it to 6 in the instance settings for a 6-digit code).
 */
export function getEmailCodeLength(): number {
  const length = Number(process.env.EMAIL_CODE_LENGTH);
  return Number.isInteger(length) && length >= 4 && length <= 12 ? length : 6;
}

/** Seconds the "Resend code" button stays disabled after a code was sent. */
export const RESEND_COOLDOWN_SECONDS = 30;
