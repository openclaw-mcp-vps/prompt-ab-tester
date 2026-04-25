"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PromptEditor } from "@/components/ui/prompt-editor";

type TestRun = {
  id: string;
  variant: "A" | "B";
  inputText: string;
  outputText: string;
  score: number;
  latencyMs: number;
  createdAt: string;
};

type TestPayload = {
  test: {
    id: string;
    name: string;
    description: string;
    provider: "openai" | "anthropic" | "mock";
    model: string;
    status: "draft" | "running" | "paused" | "completed";
    trafficSplitA: number;
    variantAPrompt: string;
    variantBPrompt: string;
  };
  runs: TestRun[];
  analytics: {
    winner: "A" | "B" | "tie";
    totalRuns: number;
    avgScore: number;
    avgLatencyMs: number;
    variants: Array<{
      variant: "A" | "B";
      runs: number;
      avgScore: number;
      avgLatencyMs: number;
    }>;
  };
};

export default function TestDetailPage() {
  const params = useParams<{ id: string }>();
  const testId = params.id;

  const [payload, setPayload] = useState<TestPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [sampleInput, setSampleInput] = useState(
    "A customer says their invoice amount changed unexpectedly this month. Draft an explanation and next steps.",
  );

  async function loadTest() {
    setError(null);
    try {
      const response = await fetch(`/api/tests/${testId}`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Could not load test details.");
      }

      const data = (await response.json()) as TestPayload;
      setPayload(data);
    } catch {
      setError("Unable to load this test right now.");
    }
  }

  useEffect(() => {
    if (testId) {
      void loadTest();
    }
  }, [testId]);

  async function saveUpdates() {
    if (!payload) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/tests/${testId}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: payload.test.name,
          description: payload.test.description,
          provider: payload.test.provider,
          model: payload.test.model,
          status: payload.test.status,
          trafficSplitA: payload.test.trafficSplitA,
          variantAPrompt: payload.test.variantAPrompt,
          variantBPrompt: payload.test.variantBPrompt,
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "Could not save changes.");
      }

      await loadTest();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save changes.");
    } finally {
      setIsSaving(false);
    }
  }

  async function executeRun() {
    setIsRunning(true);
    setError(null);

    try {
      const response = await fetch("/api/execute", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ testId, input: sampleInput }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "Execution failed.");
      }

      await loadTest();
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Execution failed.");
    } finally {
      setIsRunning(false);
    }
  }

  if (error && !payload) {
    return <p className="text-sm text-rose-300">{error}</p>;
  }

  if (!payload) {
    return <p className="text-sm text-zinc-400">Loading test details...</p>;
  }

  const { test, analytics, runs } = payload;

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle>{test.name}</CardTitle>
            <CardDescription className="mt-1">{test.description}</CardDescription>
          </div>
          <Badge tone={analytics.winner === "tie" ? "warning" : "success"}>Winner: {analytics.winner}</Badge>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300" htmlFor="test-name">
              Name
            </label>
            <Input
              id="test-name"
              value={test.name}
              onChange={(event) => setPayload((current) => (current ? { ...current, test: { ...current.test, name: event.target.value } } : current))}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300" htmlFor="provider">
              Provider
            </label>
            <select
              id="provider"
              value={test.provider}
              onChange={(event) =>
                setPayload((current) =>
                  current ? { ...current, test: { ...current.test, provider: event.target.value as "openai" | "anthropic" | "mock" } } : current,
                )
              }
              className="h-11 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100"
            >
              <option value="mock">Mock</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300" htmlFor="status">
              Status
            </label>
            <select
              id="status"
              value={test.status}
              onChange={(event) =>
                setPayload((current) =>
                  current
                    ? {
                        ...current,
                        test: {
                          ...current.test,
                          status: event.target.value as "draft" | "running" | "paused" | "completed",
                        },
                      }
                    : current,
                )
              }
              className="h-11 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100"
            >
              <option value="draft">Draft</option>
              <option value="running">Running</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300" htmlFor="model">
              Model
            </label>
            <Input
              id="model"
              value={test.model}
              onChange={(event) => setPayload((current) => (current ? { ...current, test: { ...current.test, model: event.target.value } } : current))}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300" htmlFor="split">
              Traffic split to Variant A ({test.trafficSplitA}%)
            </label>
            <input
              id="split"
              type="range"
              min={5}
              max={95}
              value={test.trafficSplitA}
              onChange={(event) =>
                setPayload((current) =>
                  current ? { ...current, test: { ...current.test, trafficSplitA: Number(event.target.value) } } : current,
                )
              }
              className="h-11 w-full accent-sky-500"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-2 block text-sm font-medium text-zinc-300" htmlFor="description">
            Description
          </label>
          <Input
            id="description"
            value={test.description}
            onChange={(event) =>
              setPayload((current) => (current ? { ...current, test: { ...current.test, description: event.target.value } } : current))
            }
          />
        </div>

        <div className="mt-4">
          <PromptEditor
            variantAPrompt={test.variantAPrompt}
            variantBPrompt={test.variantBPrompt}
            onVariantAChange={(value) =>
              setPayload((current) => (current ? { ...current, test: { ...current.test, variantAPrompt: value } } : current))
            }
            onVariantBChange={(value) =>
              setPayload((current) => (current ? { ...current, test: { ...current.test, variantBPrompt: value } } : current))
            }
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={saveUpdates} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
          <Button type="button" variant="secondary" onClick={executeRun} disabled={isRunning}>
            {isRunning ? "Executing..." : "Run Sample Input"}
          </Button>
        </div>

        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
      </Card>

      <Card>
        <CardTitle>Experiment Metrics</CardTitle>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Total runs</p>
            <p className="mt-1 text-2xl font-semibold">{analytics.totalRuns}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Average score</p>
            <p className="mt-1 text-2xl font-semibold">{analytics.avgScore}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Average latency</p>
            <p className="mt-1 text-2xl font-semibold">{analytics.avgLatencyMs}ms</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Current winner</p>
            <p className="mt-1 text-2xl font-semibold">{analytics.winner}</p>
          </div>
        </div>
        <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 text-sm text-zinc-300">
          <Input value={sampleInput} onChange={(event) => setSampleInput(event.target.value)} />
          <p className="mt-2 text-xs text-zinc-500">This input is sent to `/api/execute` to capture a new run and refresh metrics.</p>
        </div>
      </Card>

      <Card>
        <CardTitle>Recent Runs</CardTitle>
        <CardDescription className="mt-1">Latest execution logs for this test, including raw output preview and score.</CardDescription>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-zinc-800 text-zinc-400">
              <tr>
                <th className="px-3 py-2 font-medium">Time</th>
                <th className="px-3 py-2 font-medium">Variant</th>
                <th className="px-3 py-2 font-medium">Input</th>
                <th className="px-3 py-2 font-medium">Output</th>
                <th className="px-3 py-2 font-medium">Score</th>
                <th className="px-3 py-2 font-medium">Latency</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} className="border-b border-zinc-900/80 text-zinc-200">
                  <td className="px-3 py-3 text-zinc-400">{new Date(run.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-3">
                    <Badge tone={run.variant === "A" ? "default" : "success"}>{run.variant}</Badge>
                  </td>
                  <td className="max-w-[220px] truncate px-3 py-3 text-zinc-400">{run.inputText}</td>
                  <td className="max-w-[260px] truncate px-3 py-3 text-zinc-400">{run.outputText}</td>
                  <td className="px-3 py-3">{run.score}</td>
                  <td className="px-3 py-3">{run.latencyMs}ms</td>
                </tr>
              ))}
            </tbody>
          </table>

          {runs.length === 0 ? (
            <p className="rounded-lg border border-dashed border-zinc-700 p-4 text-sm text-zinc-400">
              No runs yet. Execute sample input to generate baseline performance data.
            </p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
