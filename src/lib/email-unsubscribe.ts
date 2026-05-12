import crypto from "crypto";
import { getBaseUrl } from "@/lib/seo";

/**
 * Generates a signed, non-expiring unsubscribe URL for a given userId.
 * Returns null if UNSUBSCRIBE_SECRET is not configured — callers should
 * omit the unsubscribe link rather than crashing.
 */
export function generateUnsubscribeUrl(userId: string): string | null {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) return null;
  const sig = crypto.createHmac("sha256", secret).update(userId).digest("hex");
  const uid = Buffer.from(userId).toString("base64url");
  return `${getBaseUrl()}/api/unsubscribe?uid=${uid}&sig=${sig}`;
}

/**
 * Verifies an unsubscribe token from URL params.
 * Returns the userId on success, null on any failure.
 */
export function verifyUnsubscribeToken(uid: string, sig: string): string | null {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) return null;
  try {
    const userId = Buffer.from(uid, "base64url").toString("utf8");
    // Sanity-check: must look like a UUID
    if (!/^[0-9a-f-]{36}$/i.test(userId)) return null;
    const expected = crypto.createHmac("sha256", secret).update(userId).digest("hex");
    // Both are 64-char hex; timingSafeEqual needs equal-length buffers
    if (sig.length !== expected.length) return null;
    const sigBuf = Buffer.from(sig, "hex");
    const expectedBuf = Buffer.from(expected, "hex");
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;
    return userId;
  } catch {
    return null;
  }
}
