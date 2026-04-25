"use client";

import { useEffect, useState } from "react";

import { AnalyticsChart } from "@/components/ui/analytics-chart";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

type Payload = {
  variantPerformance: Array<{
    variant: string;
    runs: number;
    avgScore: number;
    avgLatencyMs: number;
  }>;
  dailyPerformance: Array<{
    date: string;
    runs: number;
    avgScore: number;
    avgLatencyMs: number;
  }>;
};

export default function AnalyticsPage() {
  const [payload, setPayload] = useState<Payload>({ variantPerformance: [], dailyPerformance: [] });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/tests", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Unable to load analytics.");
        }

        const data = (await response.json()) as Payload;
        setPayload(data);
      } catch {
        setError("Unable to load analytics right now.");
      }
    }

    void load();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle>Variant Performance</CardTitle>
        <CardDescription className="mt-1">
          Compare score, latency, and run volume between control and challenger prompts.
        </CardDescription>
        <div className="mt-5">
          <AnalyticsChart data={payload.variantPerformance} />
        </div>
      </Card>

      <Card>
        <CardTitle>Daily Trend</CardTitle>
        <CardDescription className="mt-1">How execution quality and speed evolve by day.</CardDescription>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="border-b border-zinc-800 text-zinc-400">
              <tr>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Runs</th>
                <th className="px-3 py-2 font-medium">Avg Score</th>
                <th className="px-3 py-2 font-medium">Avg Latency (ms)</th>
              </tr>
            </thead>
            <tbody>
              {payload.dailyPerformance.map((item) => (
                <tr key={item.date} className="border-b border-zinc-900/80 text-zinc-200">
                  <td className="px-3 py-3">{item.date}</td>
                  <td className="px-3 py-3 text-zinc-400">{item.runs}</td>
                  <td className="px-3 py-3 text-zinc-400">{item.avgScore}</td>
                  <td className="px-3 py-3 text-zinc-400">{item.avgLatencyMs}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {payload.dailyPerformance.length === 0 ? (
            <p className="rounded-lg border border-dashed border-zinc-700 p-4 text-sm text-zinc-400">
              Daily trend appears after you execute prompt runs.
            </p>
          ) : null}
          {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
        </div>
      </Card>
    </div>
  );
}
