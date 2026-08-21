import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import {
  recordSubscriptionPaymentForUserId,
  saveSubscriptionPaymentReceipt,
} from "@/lib/billing/grant";
import { markReferralConvertedForUserId } from "@/lib/referrals/server";
import { getSubscriptionPlans } from "@/actions/subscription-plan";

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

/** Centavos a tier must have been charged, mirroring the intent-creation maths in src/actions/paymongo.ts. */
async function expectedCentavosForTier(tier: "pro" | "premium"): Promise<number | null> {
  const { pro, premium } = await getSubscriptionPlans();
  const plan = tier === "premium" ? premium ?? pro : pro;
  if (!plan) return null;
  return Math.round(plan.priceAmount * 100);
}

/**
 * Fetch the payment intent from PayMongo to get user metadata, then grant
 * the subscription and save a receipt.
 *
 * Trusts nothing in the webhook body beyond the intent id: the payer and tier
 * both come from the intent fetched directly from PayMongo, the intent must
 * actually be `succeeded`, and the amount must cover the claimed tier's price —
 * otherwise a PHP 20 minimum-amount intent could claim Premium.
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
  const attributes = (piJson?.data as Record<string, unknown>)?.attributes as Record<string, unknown> | undefined;
  const metadata = attributes?.metadata as Record<string, unknown> | undefined;
  const userId = metadata?.user_id as string | undefined;
  const tierRaw = metadata?.subscription_tier as string | undefined;
  const tier: "pro" | "premium" = tierRaw === "premium" ? "premium" : "pro";
  if (!userId) return;

  // The intent must really be paid. Without this an unpaid or partially-paid
  // intent id still granted a full month.
  if (attributes?.status !== "succeeded") {
    console.warn(
      `[paymongo webhook] intent ${paymentIntentId} is "${String(attributes?.status)}", not succeeded — not granting.`
    );
    return;
  }

  // The amount must cover the tier being claimed. `>=` rather than `===` so a
  // later price cut cannot reject a payment that was correct when it was made.
  const paidCentavos = Number(attributes?.amount ?? amountCents) || 0;
  const expected = await expectedCentavosForTier(tier);
  if (expected == null) {
    console.warn(`[paymongo webhook] no plan row for tier "${tier}" — not granting.`);
    return;
  }
  if (paidCentavos < expected) {
    console.warn(
      `[paymongo webhook] intent ${paymentIntentId} paid ${paidCentavos} centavos but "${tier}" costs ${expected} — not granting.`
    );
    return;
  }

  // Receipt first: it carries the unique payment_intent_id (migration 093), so a
  // replayed delivery reports inserted=false here and grants nothing further.
  const receipt = await saveSubscriptionPaymentReceipt(userId, {
    amountCents: paidCentavos,
    currency,
    description,
    paymentIntentId,
    paidAt: new Date(),
  });
  if (receipt.error) {
    console.error(`[paymongo webhook] receipt failed for ${paymentIntentId}: ${receipt.error}`);
    return;
  }
  if (!receipt.inserted) return; // already processed — a replay

  await recordSubscriptionPaymentForUserId(userId, tier);
  // The profiles_referral_conversion trigger already pays the referrer when
  // is_subscriber flips; this call makes the payout explicit and observable
  // from the webhook. Idempotent, and a no-op when the payer was not referred.
  await markReferralConvertedForUserId(userId).catch(() => ({}));
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();

    // Fail CLOSED. Previously a missing/empty PAYMONGO_WEBHOOK_SECRET_KEY skipped
    // verification entirely, so anyone could POST a payment.paid body and be granted
    // a subscription. An unconfigured webhook is a deployment fault, not open season.
    const webhookSecret = getWebhookSecret();
    if (!webhookSecret) {
      console.error("[paymongo webhook] PAYMONGO_WEBHOOK_SECRET_KEY is not set — rejecting.");
      return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
    }
    const sigHeader = request.headers.get("Paymongo-Signature");
    if (!verifySignature(rawBody, sigHeader, webhookSecret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
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
