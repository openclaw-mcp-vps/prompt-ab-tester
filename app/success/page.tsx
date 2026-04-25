import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { UnlockAccessForm } from "@/components/ui/unlock-access-form";

export const metadata: Metadata = {
  title: "Checkout Complete | Prompt AB Tester",
  description: "Unlock your Prompt AB Tester dashboard with the email used during checkout.",
};

export default function SuccessPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Card className="bg-zinc-950/70">
        <CardTitle className="font-[var(--font-heading)] text-3xl">Checkout complete</CardTitle>
        <CardDescription className="mt-3 leading-relaxed text-zinc-300">
          Your payment was received. Enter the same email you used at checkout to issue your dashboard access cookie.
        </CardDescription>
        <UnlockAccessForm />
        <Link href="/" className="mt-6 inline-block text-sm text-sky-300 hover:text-sky-200">
          Return to landing page
        </Link>
      </Card>
    </main>
  );
}
