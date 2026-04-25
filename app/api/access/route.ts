import { NextResponse } from "next/server";
import { z } from "zod";

import { findPurchaseByEmail } from "@/lib/db";
import {
  createAccessToken,
  PAYWALL_COOKIE_MAX_AGE_SECONDS,
  PAYWALL_COOKIE_NAME,
} from "@/lib/paywall";

export const runtime = "nodejs";

const accessSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = accessSchema.parse(body);

    const purchase = await findPurchaseByEmail(input.email);
    if (!purchase) {
      return NextResponse.json(
        {
          error: "No paid subscription found for this email yet. Wait for webhook sync or confirm checkout email.",
        },
        { status: 403 },
      );
    }

    const token = createAccessToken(input.email.trim().toLowerCase());
    const response = NextResponse.json({ message: "Access granted." });
    response.cookies.set({
      name: PAYWALL_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: PAYWALL_COOKIE_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to unlock access.",
      },
      { status: 500 },
    );
  }
}

export function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: PAYWALL_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
