import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { upsertPurchase } from "@/lib/db";

export const runtime = "nodejs";

function safeEqualHex(a: string, b: string) {
  const aBuf = Buffer.from(a, "hex");
  const bBuf = Buffer.from(b, "hex");

  if (aBuf.length !== bBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuf, bBuf);
}

function verifyStripeSignature(rawBody: string, stripeSignature: string, secret: string) {
  const fields = stripeSignature.split(",").map((entry) => entry.trim());
  const timestamp = fields.find((entry) => entry.startsWith("t="))?.slice(2);
  const signatures = fields.filter((entry) => entry.startsWith("v1=")).map((entry) => entry.slice(3));

  if (!timestamp || signatures.length === 0) {
    return false;
  }

  const expected = crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  return signatures.some((signature) => safeEqualHex(signature, expected));
}

type StripeEvent = {
  type: string;
  data?: {
    object?: {
      id?: string;
      customer_email?: string;
      customer_details?: {
        email?: string;
      };
    };
  };
};

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("stripe-signature");
    const secret = process.env.STRIPE_WEBHOOK_SECRET;

    if (secret) {
      if (!signature || !verifyStripeSignature(rawBody, signature, secret)) {
        return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
      }
    }

    const event = JSON.parse(rawBody) as StripeEvent;

    if (event.type === "checkout.session.completed") {
      const session = event.data?.object;
      const email = session?.customer_details?.email ?? session?.customer_email;
      const checkoutId = session?.id;

      if (email && checkoutId) {
        await upsertPurchase(email, checkoutId, "stripe-payment-link");
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Webhook handling failed.",
      },
      { status: 500 },
    );
  }
}
