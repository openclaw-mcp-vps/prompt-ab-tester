"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TestCreator } from "@/components/ui/test-creator";

type TestSummary = {
  id: string;
  name: string;
  status: string;
  provider: string;
  model: string;
  trafficSplitA: number;
  analytics: {
    winner: "A" | "B" | "tie";
    totalRuns: number;
    avgScore: number;
    avgLatencyMs: number;
  };
};

export default function TestsPage() {
  const router = useRouter();
  const [tests, setTests] = useState<TestSummary[]>([]);
  const [sampleInput, setSampleInput] = useState("Summarize the root cause of a failed login event and propose a quick fix.");
  const [busyTestId, setBusyTestId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadTests() {
    const response = await fetch("/api/tests", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Could not load tests.");
    }

    const payload = (await response.json()) as { tests: TestSummary[] };
    setTests(payload.tests);
  }

  useEffect(() => {
    void loadTests();
  }, []);

  async function runSample(testId: string) {
    setBusyTestId(testId);
    setMessage(null);

    try {
      const response = await fetch("/api/execute", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ testId, input: sampleInput }),
      });

      const payload = (await response.json()) as { error?: string; run?: { variant: "A" | "B"; score: number } };
      if (!response.ok) {
        throw new Error(payload.error ?? "Execution failed.");
      }

      setMessage(`Run recorded on variant ${payload.run?.variant} with score ${payload.run?.score}.`);
      await loadTests();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Execution failed.");
    } finally {
      setBusyTestId(null);
    }
  }

  return (
    <div className="space-y-6">
      <TestCreator
        onCreated={(id) => {
          router.push(`/dashboard/tests/${id}`);
        }}
      />

      <Card>
        <CardTitle>Execute Sample Input</CardTitle>
        <CardDescription className="mt-1">
          Send one real user input through any test to immediately generate score and latency metrics.
        </CardDescription>
        <Input className="mt-4" value={sampleInput} onChange={(event) => setSampleInput(event.target.value)} />
        {message ? <p className="mt-3 text-sm text-zinc-300">{message}</p> : null}
      </Card>

      <Card>
        <CardTitle>All Prompt Tests</CardTitle>
        <CardDescription className="mt-1">Compare winner, run volume, and latency before promoting a variant.</CardDescription>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-zinc-800 text-zinc-400">
              <tr>
                <th className="px-3 py-2 font-medium">Test</th>
                <th className="px-3 py-2 font-medium">Provider / Model</th>
                <th className="px-3 py-2 font-medium">Split A</th>
                <th className="px-3 py-2 font-medium">Runs</th>
                <th className="px-3 py-2 font-medium">Winner</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((test) => (
                <tr key={test.id} className="border-b border-zinc-900/80 text-zinc-200">
                  <td className="px-3 py-3">
                    <p className="font-medium">{test.name}</p>
                    <p className="text-xs text-zinc-500">Status: {test.status}</p>
                  </td>
                  <td className="px-3 py-3 text-zinc-400">{test.provider} / {test.model}</td>
                  <td className="px-3 py-3 text-zinc-400">{test.trafficSplitA}%</td>
                  <td className="px-3 py-3 text-zinc-400">{test.analytics.totalRuns}</td>
                  <td className="px-3 py-3">
                    <Badge tone={test.analytics.winner === "tie" ? "warning" : "success"}>{test.analytics.winner}</Badge>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/dashboard/tests/${test.id}`}
                        className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
                      >
                        Details
                      </Link>
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-8 px-3 py-1 text-xs"
                        disabled={busyTestId === test.id}
                        onClick={() => runSample(test.id)}
                      >
                        {busyTestId === test.id ? "Running..." : "Run Input"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tests.length === 0 ? (
            <p className="rounded-lg border border-dashed border-zinc-700 p-4 text-sm text-zinc-400">
              Create your first test above. We recommend starting with your current production prompt as Variant A.
            </p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
