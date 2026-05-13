"use server";

import { createClient } from "@/lib/supabase/server";
import { getSubscriptionPlans } from "./subscription-plan";

const PAYMONGO_API = "https://api.paymongo.com/v1";

/** Minimum amount in centavos (PHP 20) per PayMongo */
const MIN_AMOUNT_CENTAVOS = 2000;

function getSecretKey(): string | null {
  const key = process.env.PAYMONGO_SECRET_KEY;
  return key?.trim() || null;
}

/** Create a Payment Intent and attach a QR Ph payment method; return QR image for display. */
export async function createPayMongoQRPhPaymentIntent(
  planId: "pro" | "premium" = "pro"
): Promise<{
  paymentIntentId?: string;
  qrImageDataUrl?: string;
  error?: string;
}> {
  const secret = getSecretKey();
  if (!secret) return { error: "PayMongo is not configured. Set PAYMONGO_SECRET_KEY." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const { pro, premium } = await getSubscriptionPlans();
  const plan = planId === "premium" ? premium ?? pro : pro;
  if (!plan) return { error: "Subscription plan not found." };
  if (!plan.enabled) return { error: `The ${plan.name} plan is currently unavailable.` };
  // PayMongo QR PH uses PHP; amount in centavos (100 centavos = 1 PHP). Min 2000 centavos = 20 PHP.
  const amountCentavos = Math.round(plan.priceAmount * 100);
  if (amountCentavos < MIN_AMOUNT_CENTAVOS) {
    return {
      error: `QR PH minimum is PHP 20. Your plan is set to ${plan.priceAmount} ${plan.priceCurrency}. Update Admin → Pricing to at least 20 PHP for QR PH.`,
    };
  }
  const currency = plan.priceCurrency === "PHP" ? "PHP" : "PHP";

  const authHeader = `Basic ${Buffer.from(`${secret}:`).toString("base64")}`;

  try {
    const res1 = await fetch(`${PAYMONGO_API}/payment_intents`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: amountCentavos,
            currency,
            payment_method_allowed: ["qrph"],
            description: `${plan.name} subscription (1 ${plan.interval})`,
            metadata: { user_id: user.id, subscription_tier: planId },
          },
        },
      }),
    });
    if (!res1.ok) {
      const err = await res1.text();
      return { error: `PayMongo Payment Intent: ${res1.status} ${err}` };
    }
    const piJson = await res1.json();
    const pi = piJson?.data;
    const paymentIntentId = pi?.id;
    const clientKey = pi?.attributes?.client_key;
    if (!paymentIntentId) return { error: "Invalid PayMongo response: no payment intent id." };

    const res2 = await fetch(`${PAYMONGO_API}/payment_methods`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          attributes: {
            type: "qrph",
            billing: {
              name: user.user_metadata?.full_name ?? user.email ?? "Customer",
              email: user.email ?? "",
            },
          },
        },
      }),
    });
    if (!res2.ok) {
      const err = await res2.text();
      return { error: `PayMongo Payment Method: ${res2.status} ${err}` };
    }
    const pmJson = await res2.json();
    const pmId = pmJson?.data?.id;
    if (!pmId) return { error: "Invalid PayMongo response: no payment method id." };

    const res3 = await fetch(`${PAYMONGO_API}/payment_intents/${paymentIntentId}/attach`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          attributes: {
            payment_method: pmId,
            ...(clientKey && { client_key: clientKey }),
          },
        },
      }),
    });
    if (!res3.ok) {
      const err = await res3.text();
      return { error: `PayMongo Attach: ${res3.status} ${err}` };
    }
    const attachJson = await res3.json();
    const nextAction = attachJson?.data?.attributes?.next_action;
    const imageUrl = nextAction?.code?.image_url ?? nextAction?.consume_qr?.image_url;
    if (!imageUrl || typeof imageUrl !== "string") {
      return { error: "PayMongo did not return a QR image. Try again." };
    }
    return { paymentIntentId, qrImageDataUrl: imageUrl };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "PayMongo request failed." };
  }
}

/**
 * Create a PayMongo Checkout Session.
 * Returns a hosted checkout URL that the user should be redirected to.
 * Supports GCash, Maya, QR PH, GrabPay, and credit/debit cards in one flow.
 * PayMongo fires `checkout_session.payment.paid` webhook on success.
 */
export async function createPayMongoCheckoutSession(
  planId: "pro" | "premium" = "pro",
  methods: string[] = ["gcash", "paymaya", "qrph", "card", "grab_pay"]
): Promise<{ checkoutUrl?: string; sessionId?: string; error?: string }> {
  const secret = getSecretKey();
  if (!secret) return { error: "PayMongo is not configured. Set PAYMONGO_SECRET_KEY." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const { pro, premium } = await getSubscriptionPlans();
  const plan = planId === "premium" ? premium ?? pro : pro;
  if (!plan) return { error: "Subscription plan not found." };
  if (!plan.enabled) return { error: `The ${plan.name} plan is currently unavailable.` };

  const amountCentavos = Math.round(plan.priceAmount * 100);
  if (amountCentavos < MIN_AMOUNT_CENTAVOS) {
    return { error: `Minimum is PHP 20. Update Admin → Pricing to at least PHP 20.` };
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://omnitrak.cloud").replace(/\/$/, "");
  const authHeader = `Basic ${Buffer.from(`${secret}:`).toString("base64")}`;

  try {
    const res = await fetch(`${PAYMONGO_API}/checkout_sessions`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          attributes: {
            billing: {
              name: user.user_metadata?.full_name ?? user.email ?? "Customer",
              email: user.email ?? "",
            },
            send_email_receipt: false,
            show_description: true,
            show_line_items: true,
            cancel_url: `${siteUrl}/account/subscription/payment?plan=${planId}&canceled=1`,
            success_url: `${siteUrl}/account/subscription?paid=1`,
            description: `${plan.name} subscription (1 ${plan.interval})`,
            line_items: [
              {
                currency: "PHP",
                amount: amountCentavos,
                name: plan.name,
                quantity: 1,
              },
            ],
            payment_method_types: methods,
            metadata: { user_id: user.id, subscription_tier: planId },
          },
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { error: `PayMongo ${res.status}: ${err}` };
    }

    const json = await res.json();
    const checkoutUrl = json?.data?.attributes?.checkout_url as string | undefined;
    const sessionId = json?.data?.id as string | undefined;
    if (!checkoutUrl) return { error: "PayMongo did not return a checkout URL. Try again." };
    return { checkoutUrl, sessionId };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "PayMongo request failed." };
  }
}

/** Retrieve payment intent status; if succeeded, grant subscription and return status. */
export async function checkPayMongoPaymentStatus(
  paymentIntentId: string
): Promise<{ status: "succeeded" | "awaiting_payment" | "failed"; error?: string }> {
  const secret = getSecretKey();
  if (!secret) return { status: "failed", error: "PayMongo is not configured." };

  const authHeader = `Basic ${Buffer.from(`${secret}:`).toString("base64")}`;
  try {
    const res = await fetch(`${PAYMONGO_API}/payment_intents/${paymentIntentId}`, {
      method: "GET",
      headers: { Authorization: authHeader },
    });
    if (!res.ok) return { status: "failed", error: `PayMongo: ${res.status}` };
    const json = await res.json();
    const attrs = json?.data?.attributes;
    const status = attrs?.status;
    if (status === "succeeded") {
      const { recordSubscriptionPaymentForUserId } = await import("./budget");
      const { saveSubscriptionPaymentReceipt } = await import("./receipts");
      const userId = attrs?.metadata?.user_id;
      const tierRaw = attrs?.metadata?.subscription_tier;
      const tier = tierRaw === "premium" ? "premium" : "pro";
      if (userId) {
        const result = await recordSubscriptionPaymentForUserId(userId, tier);
        if (result.error) return { status: "succeeded", error: result.error };
        await saveSubscriptionPaymentReceipt(userId, {
          amountCents: attrs?.amount ?? 0,
          currency: attrs?.currency ?? "PHP",
          description: attrs?.description ?? "Pro subscription",
          paymentIntentId,
          paidAt: new Date(),
        });
      }
      return { status: "succeeded" };
    }
    if (status === "awaiting_payment_method" || status === "awaiting_next_action") {
      return { status: "awaiting_payment" };
    }
    return { status: "failed", error: status ?? "Unknown status" };
  } catch (e) {
    return { status: "failed", error: e instanceof Error ? e.message : "Request failed." };
  }
}
