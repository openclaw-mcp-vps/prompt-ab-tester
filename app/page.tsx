import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { UnlockAccessForm } from "@/components/ui/unlock-access-form";

export const metadata: Metadata = {
  title: "Prompt AB Tester | A/B test prompts with usage analytics",
  description:
    "Teams stop guessing which prompt works. Route traffic, score outputs, and promote winners from one dashboard.",
};

const problems = [
  {
    title: "Prompt decisions are opinion-driven",
    detail:
      "Teams rely on subjective reviews and screenshots. Without controlled runs, it is impossible to know whether a prompt revision improved quality.",
  },
  {
    title: "Latency regressions ship unnoticed",
    detail:
      "A prompt that sounds better can quietly add seconds of response time. Product teams need score and speed in the same report before rollout.",
  },
  {
    title: "Consulting audits take too long",
    detail:
      "Consultants spend days building ad hoc spreadsheets for every client. Standardized experiment logs cut audit delivery from weeks to hours.",
  },
];

const solutions = [
  "Create control/challenger prompts and tune traffic split in one form.",
  "Route live sample inputs through either OpenAI, Anthropic, or local mock mode.",
  "Track score, latency, and token trends per variant with automatic winner detection.",
  "Lock the dashboard behind paid access and issue cookie-based unlock after checkout.",
];

const faqs = [
  {
    q: "What does the $29 plan include?",
    a: "Unlimited prompt tests, execution logs, variant analytics, and webhook-based purchase unlock for one workspace.",
  },
  {
    q: "Do I need to migrate existing prompts?",
    a: "No. Paste your current prompt as Variant A, add your improved draft as Variant B, then start routing sample traffic immediately.",
  },
  {
    q: "Can we use this without connecting OpenAI or Anthropic keys?",
    a: "Yes. Mock provider mode generates deterministic outputs so teams can validate workflow and analytics before enabling real model APIs.",
  },
  {
    q: "How does access control work?",
    a: "After payment, Stripe webhook events register the purchaser email. The email is then used once to issue a signed access cookie for dashboard entry.",
  },
];

export default function HomePage() {
  return (
    <main className="relative overflow-x-hidden">
      <div className="mx-auto max-w-6xl px-6 pb-24 pt-12 md:px-8 md:pt-16">
        <header className="relative rounded-3xl border border-zinc-800/85 bg-zinc-950/70 p-8 shadow-[0_40px_80px_-60px_rgba(14,165,233,0.65)] md:p-12">
          <p className="inline-flex rounded-full border border-sky-400/40 bg-sky-500/10 px-3 py-1 text-xs font-semibold tracking-wide text-sky-200 uppercase">
            ai-prompt-management
          </p>
          <h1 className="mt-5 max-w-3xl font-[var(--font-heading)] text-4xl leading-tight font-bold text-zinc-50 md:text-6xl">
            A/B test prompts with usage analytics
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-300 md:text-lg">
            Run prompt experiments with objective quality scoring and latency tracking. Stop shipping prompt changes that feel better but perform worse.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href={process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK}
              className="inline-flex w-full items-center justify-center rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-[#0d1117] transition-colors hover:bg-sky-400 sm:w-auto"
            >
              Buy for $29/mo
            </a>
            <Link
              href="/dashboard"
              className="inline-flex w-full items-center justify-center rounded-md bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-100 transition-colors hover:bg-zinc-700 sm:w-auto"
            >
              Open Dashboard
            </Link>
          </div>
          <p className="mt-3 text-sm text-zinc-400">Built for AI product teams and prompt consultants who need hard evidence before rollout.</p>

          <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
            <UnlockAccessForm />
          </div>
        </header>

        <section className="mt-16">
          <h2 className="font-[var(--font-heading)] text-3xl font-semibold text-zinc-100">Why teams lose weeks on prompt testing</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {problems.map((problem) => (
              <Card key={problem.title}>
                <CardTitle>{problem.title}</CardTitle>
                <CardDescription className="mt-2 leading-relaxed">{problem.detail}</CardDescription>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-16 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <Card className="bg-gradient-to-br from-zinc-900/80 via-zinc-900/50 to-sky-950/25">
            <CardTitle className="font-[var(--font-heading)] text-2xl">What Prompt AB Tester does differently</CardTitle>
            <ul className="mt-4 space-y-3 text-zinc-300">
              {solutions.map((item) => (
                <li key={item} className="flex gap-3 leading-relaxed">
                  <span className="mt-1 h-2 w-2 rounded-full bg-sky-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="border-emerald-500/25 bg-zinc-950/80">
            <CardTitle className="font-[var(--font-heading)] text-2xl">Pricing</CardTitle>
            <p className="mt-4 text-4xl font-bold text-zinc-100">$29<span className="text-xl font-medium text-zinc-400">/mo</span></p>
            <p className="mt-3 text-sm text-zinc-400">Single-team workspace with unlimited experiments and execution logs.</p>
            <a
              href={process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK}
              className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-[#0d1117] transition-colors hover:bg-sky-400"
            >
              Start Subscription
            </a>
            <p className="mt-2 text-xs text-zinc-500">Hosted Stripe checkout. No embedded widget, no hidden fees.</p>
          </Card>
        </section>

        <section className="mt-16">
          <h2 className="font-[var(--font-heading)] text-3xl font-semibold text-zinc-100">FAQ</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {faqs.map((faq) => (
              <Card key={faq.q} className="bg-zinc-950/65">
                <CardTitle>{faq.q}</CardTitle>
                <CardDescription className="mt-2 leading-relaxed">{faq.a}</CardDescription>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
