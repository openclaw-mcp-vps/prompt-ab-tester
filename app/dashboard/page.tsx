"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

type OverviewPayload = {
  overview: {
    totalTests: number;
    activeTests: number;
    totalRuns: number;
    avgScore: number;
    avgLatencyMs: number;
  };
  tests: Array<{
    id: string;
    name: string;
    status: string;
    analytics: {
      winner: "A" | "B" | "tie";
      totalRuns: number;
      avgScore: number;
      avgLatencyMs: number;
    };
  }>;
};

const emptyOverview = {
  totalTests: 0,
  activeTests: 0,
  totalRuns: 0,
  avgScore: 0,
  avgLatencyMs: 0,
};

export default function DashboardHomePage() {
  const [payload, setPayload] = useState<OverviewPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/tests", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to load dashboard analytics.");
        }

        const data = (await response.json()) as OverviewPayload;
        setPayload(data);
      } catch {
        setError("Unable to load dashboard data right now.");
      }
    }

    void load();
  }, []);

  const overview = payload?.overview ?? emptyOverview;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardDescription>Total Tests</CardDescription>
          <CardTitle className="mt-3 text-2xl">{overview.totalTests}</CardTitle>
        </Card>
        <Card>
          <CardDescription>Active Tests</CardDescription>
          <CardTitle className="mt-3 text-2xl">{overview.activeTests}</CardTitle>
        </Card>
        <Card>
          <CardDescription>Total Runs</CardDescription>
          <CardTitle className="mt-3 text-2xl">{overview.totalRuns}</CardTitle>
        </Card>
        <Card>
          <CardDescription>Average Score</CardDescription>
          <CardTitle className="mt-3 text-2xl">{overview.avgScore}</CardTitle>
        </Card>
        <Card>
          <CardDescription>Average Latency</CardDescription>
          <CardTitle className="mt-3 text-2xl">{overview.avgLatencyMs}ms</CardTitle>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardTitle>Recent Test Health</CardTitle>
          <CardDescription className="mt-1">Winning prompt variant by measured run score and latency.</CardDescription>
          {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
          <div className="mt-5 space-y-3">
            {(payload?.tests ?? []).slice(0, 5).map((test) => (
              <div key={test.id} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-zinc-100">{test.name}</p>
                  <Badge tone={test.analytics.winner === "tie" ? "warning" : "success"}>
                    Winner: {test.analytics.winner}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-zinc-400">
                  {test.analytics.totalRuns} runs • {test.analytics.avgScore} avg score • {test.analytics.avgLatencyMs}ms avg latency
                </p>
                <Link href={`/dashboard/tests/${test.id}`} className="mt-2 inline-block text-sm text-sky-300 hover:text-sky-200">
                  Open test details
                </Link>
              </div>
            ))}
            {payload && payload.tests.length === 0 ? (
              <p className="rounded-lg border border-dashed border-zinc-700 p-4 text-sm text-zinc-400">
                No tests yet. Create one in the Tests tab and run sample traffic.
              </p>
            ) : null}
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-zinc-900/80 to-sky-950/20">
          <CardTitle>Fast Start</CardTitle>
          <CardDescription className="mt-2">Three-step loop your team can repeat every sprint.</CardDescription>
          <ol className="mt-4 space-y-3 text-sm text-zinc-300">
            <li>1. Define Variant A and Variant B prompts.</li>
            <li>2. Execute sample user inputs through `/api/execute`.</li>
            <li>3. Promote the winner once score and latency stabilize.</li>
          </ol>
          <Link href="/dashboard/tests" className="mt-5 inline-block rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-[#0d1117] hover:bg-sky-400">
            Launch a Test
          </Link>
        </Card>
      </section>
    </div>
  );
}
