import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Computes an HMAC-SHA256 hex digest for a webhook payload string.
 */
export function signWebhookPayload(
  secret: string,
  payload: string | Record<string, any>,
): string {
  const content =
    typeof payload === "string" ? payload : JSON.stringify(payload);
  const hmac = createHmac("sha256", secret);
  hmac.update(content, "utf8");
  return `sha256=${hmac.digest("hex")}`;
}

/**
 * Validates an incoming webhook signature using timing-safe comparison to prevent timing attacks.
 */
export function verifyWebhookSignature(
  secret: string,
  payload: string | Record<string, any>,
  receivedHeader: string | undefined | null,
): boolean {
  if (!receivedHeader || !secret) return false;

  const expectedSignature = signWebhookPayload(secret, payload);

  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  const receivedBuffer = Buffer.from(receivedHeader, "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}
