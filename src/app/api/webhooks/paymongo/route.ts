import { NextResponse } from "next/server";
import { recordSubscriptionPaymentForUserId } from "@/actions/budget";
import { saveSubscriptionPaymentReceipt } from "@/actions/receipts";

const PAYMONGO_API = "https://api.paymongo.com/v1";

function getSecretKey(): string | null {
  const key = process.env.PAYMONGO_SECRET_KEY;
  return key?.trim() || null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const eventType = body?.data?.attributes?.type ?? body?.data?.type;
    if (eventType !== "payment.paid") {
      return NextResponse.json({ received: true }, { status: 200 });
    }
    const payment = body?.data?.attributes?.data ?? body?.data;
    const paymentIntentId = payment?.attributes?.payment_intent_id;
    const amountCents = payment?.attributes?.amount;
    const currency = payment?.attributes?.currency ?? "PHP";
    const description = payment?.attributes?.description ?? "Pro subscription";
    if (!paymentIntentId) {
      return NextResponse.json({ received: true }, { status: 200 });
    }
    const secret = getSecretKey();
    if (!secret) {
      return NextResponse.json({ error: "PayMongo not configured" }, { status: 500 });
    }
    const authHeader = `Basic ${Buffer.from(`${secret}:`).toString("base64")}`;
    const res = await fetch(`${PAYMONGO_API}/payment_intents/${paymentIntentId}`, {
      method: "GET",
      headers: { Authorization: authHeader },
    });
    if (!res.ok) {
      return NextResponse.json({ received: true }, { status: 200 });
    }
    const piJson = await res.json();
    const userId = piJson?.data?.attributes?.metadata?.user_id;
    const tierRaw = piJson?.data?.attributes?.metadata?.subscription_tier;
    const tier = tierRaw === "premium" ? "premium" : "pro";
    if (userId) {
      await recordSubscriptionPaymentForUserId(userId, tier);
      await saveSubscriptionPaymentReceipt(userId, {
        amountCents: amountCents ?? 0,
        currency,
        description,
        paymentIntentId,
        paidAt: new Date(),
      });
    }
    return NextResponse.json({ received: true }, { status: 200 });
  } catch {
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
