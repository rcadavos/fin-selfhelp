import { NextResponse } from "next/server";
import { recordSubscriptionPaymentForUserId } from "@/actions/budget";

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
    if (userId) {
      await recordSubscriptionPaymentForUserId(userId);
    }
    return NextResponse.json({ received: true }, { status: 200 });
  } catch {
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
