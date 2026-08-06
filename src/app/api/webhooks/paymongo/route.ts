import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { recordSubscriptionPaymentForUserId } from "@/actions/budget";
import { saveSubscriptionPaymentReceipt } from "@/actions/receipts";
import { markReferralConvertedForUserId } from "@/actions/referrals";

const PAYMONGO_API = "https://api.paymongo.com/v1";

function getSecretKey(): string | null {
  return process.env.PAYMONGO_SECRET_KEY?.trim() || null;
}

function getWebhookSecret(): string | null {
  return process.env.PAYMONGO_WEBHOOK_SECRET_KEY?.trim() || null;
}

/**
 * Verify PayMongo webhook signature.
 * Header format: "t=<timestamp>,te=<test_sig>,li=<live_sig>"
 * Signature is HMAC-SHA256 of "<timestamp>.<rawBody>" using the webhook secret.
 */
function verifySignature(rawBody: string, sigHeader: string | null, secret: string): boolean {
  if (!sigHeader) return false;
  const parts: Record<string, string> = {};
  for (const chunk of sigHeader.split(",")) {
    const idx = chunk.indexOf("=");
    if (idx > 0) parts[chunk.slice(0, idx)] = chunk.slice(idx + 1);
  }
  const timestamp = parts["t"];
  const signature = parts["li"] ?? parts["te"]; // li = live mode, te = test mode
  if (!timestamp || !signature) return false;
  const message = `${timestamp}.${rawBody}`;
  const computed = createHmac("sha256", secret).update(message).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}

/**
 * Fetch the payment intent from PayMongo to get user metadata, then grant
 * the subscription and save a receipt.
 */
async function grantSubscriptionFromIntent(
  paymentIntentId: string,
  amountCents: number,
  currency: string,
  description: string
): Promise<void> {
  const secret = getSecretKey();
  if (!secret) return;
  const authHeader = `Basic ${Buffer.from(`${secret}:`).toString("base64")}`;
  const res = await fetch(`${PAYMONGO_API}/payment_intents/${paymentIntentId}`, {
    method: "GET",
    headers: { Authorization: authHeader },
  });
  if (!res.ok) return;
  const piJson = await res.json() as Record<string, unknown>;
  const metadata = ((piJson?.data as Record<string, unknown>)?.attributes as Record<string, unknown>)?.metadata as Record<string, unknown> | undefined;
  const userId = metadata?.user_id as string | undefined;
  const tierRaw = metadata?.subscription_tier as string | undefined;
  const tier: "pro" | "premium" = tierRaw === "premium" ? "premium" : "pro";
  if (userId) {
    await recordSubscriptionPaymentForUserId(userId, tier);
    await saveSubscriptionPaymentReceipt(userId, {
      amountCents,
      currency,
      description,
      paymentIntentId,
      paidAt: new Date(),
    });
    // The profiles_referral_conversion trigger already pays the referrer when
    // is_subscriber flips; this call makes the payout explicit and observable
    // from the webhook. Idempotent, and a no-op when the payer was not referred.
    await markReferralConvertedForUserId(userId).catch(() => ({}));
  }
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();

    // Verify signature when webhook secret is configured
    const webhookSecret = getWebhookSecret();
    if (webhookSecret) {
      const sigHeader = request.headers.get("Paymongo-Signature");
      if (!verifySignature(rawBody, sigHeader, webhookSecret)) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const body = JSON.parse(rawBody) as Record<string, unknown>;
    const attrs = (body?.data as Record<string, unknown>)?.attributes as Record<string, unknown> | undefined;
    const eventType = attrs?.type as string | undefined;

    if (eventType === "payment.paid") {
      // Triggered by direct payment intent payments (e.g. inline QR PH)
      const payment = attrs?.data as Record<string, unknown> | undefined;
      const paymentAttrs = payment?.attributes as Record<string, unknown> | undefined;
      const paymentIntentId = paymentAttrs?.payment_intent_id as string | undefined;
      if (paymentIntentId) {
        await grantSubscriptionFromIntent(
          paymentIntentId,
          (paymentAttrs?.amount as number) ?? 0,
          (paymentAttrs?.currency as string) ?? "PHP",
          (paymentAttrs?.description as string) ?? "Subscription"
        );
      }
    } else if (eventType === "checkout_session.payment.paid") {
      // Triggered by PayMongo Checkout Session payments (GCash, Maya, card, etc.)
      const session = attrs?.data as Record<string, unknown> | undefined;
      const sessionAttrs = session?.attributes as Record<string, unknown> | undefined;
      const paymentIntent = sessionAttrs?.payment_intent as Record<string, unknown> | undefined;
      const paymentIntentId = paymentIntent?.id as string | undefined;
      const payments = (sessionAttrs?.payments as Array<Record<string, unknown>>) ?? [];
      const firstPmt = payments[0]?.attributes as Record<string, unknown> | undefined;
      const amountCents = (firstPmt?.amount as number) ?? (paymentIntent?.attributes as Record<string, unknown>)?.amount as number ?? 0;
      const currency = (firstPmt?.currency as string) ?? "PHP";
      const description = (sessionAttrs?.description as string) ?? "Subscription";
      if (paymentIntentId) {
        await grantSubscriptionFromIntent(paymentIntentId, amountCents, currency, description);
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch {
    // Always return 200 so PayMongo doesn't retry on parse errors
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
