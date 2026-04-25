import type { PromptTest, TestRun } from "@/lib/db";

export type VariantAnalytics = {
  variant: "A" | "B";
  runs: number;
  avgScore: number;
  avgLatencyMs: number;
  avgTokens: number;
  p95LatencyMs: number;
};

export type TestAnalytics = {
  totalRuns: number;
  avgScore: number;
  avgLatencyMs: number;
  winner: "A" | "B" | "tie";
  variants: VariantAnalytics[];
  scoreDelta: number;
};

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function percentile(values: number[], pct: number) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((pct / 100) * sorted.length) - 1;
  return sorted[Math.min(Math.max(index, 0), sorted.length - 1)];
}

function summarizeVariant(runs: TestRun[], variant: "A" | "B"): VariantAnalytics {
  const scoped = runs.filter((run) => run.variant === variant);

  return {
    variant,
    runs: scoped.length,
    avgScore: round(average(scoped.map((run) => run.score))),
    avgLatencyMs: round(average(scoped.map((run) => run.latencyMs))),
    avgTokens: round(average(scoped.map((run) => run.tokens ?? 0))),
    p95LatencyMs: round(percentile(scoped.map((run) => run.latencyMs), 95)),
  };
}

export function getTestAnalytics(runs: TestRun[]): TestAnalytics {
  const variantA = summarizeVariant(runs, "A");
  const variantB = summarizeVariant(runs, "B");

  const avgScore = round(average(runs.map((run) => run.score)));
  const avgLatencyMs = round(average(runs.map((run) => run.latencyMs)));
  const scoreDelta = round(variantA.avgScore - variantB.avgScore);

  let winner: "A" | "B" | "tie" = "tie";
  if (variantA.runs > 0 && variantB.runs > 0) {
    if (variantA.avgScore > variantB.avgScore) {
      winner = "A";
    } else if (variantA.avgScore < variantB.avgScore) {
      winner = "B";
    } else if (variantA.avgLatencyMs < variantB.avgLatencyMs) {
      winner = "A";
    } else if (variantB.avgLatencyMs < variantA.avgLatencyMs) {
      winner = "B";
    }
  }

  return {
    totalRuns: runs.length,
    avgScore,
    avgLatencyMs,
    winner,
    variants: [variantA, variantB],
    scoreDelta,
  };
}

export function scoreOutput(input: string, output: string) {
  const inputTokens = new Set(
    input
      .toLowerCase()
      .split(/\W+/)
      .map((token) => token.trim())
      .filter(Boolean),
  );

  const outputTokens = new Set(
    output
      .toLowerCase()
      .split(/\W+/)
      .map((token) => token.trim())
      .filter(Boolean),
  );

  const overlap = [...inputTokens].filter((token) => outputTokens.has(token)).length;
  const lexicalCoverage = inputTokens.size === 0 ? 0.8 : overlap / inputTokens.size;

  const lengthScore = Math.min(output.length / 800, 1);
  const punctuationScore = /[.!?]/.test(output) ? 1 : 0.6;
  const structureScore = /\n|\d\.|-\s/.test(output) ? 1 : 0.7;

  const blended = (lexicalCoverage * 0.4 + lengthScore * 0.2 + punctuationScore * 0.2 + structureScore * 0.2) * 100;
  return round(Math.max(25, Math.min(98, blended)));
}

export function getOverview(tests: PromptTest[], runs: TestRun[]) {
  const activeTests = tests.filter((test) => test.status === "running").length;
  const avgScore = round(average(runs.map((run) => run.score)));
  const avgLatencyMs = round(average(runs.map((run) => run.latencyMs)));

  return {
    totalTests: tests.length,
    activeTests,
    totalRuns: runs.length,
    avgScore,
    avgLatencyMs,
  };
}

export function getVariantLeaderboard(runs: TestRun[]) {
  const byVariant = {
    A: runs.filter((run) => run.variant === "A"),
    B: runs.filter((run) => run.variant === "B"),
  };

  return ["A", "B"].map((variant) => {
    const scoped = byVariant[variant as "A" | "B"];
    return {
      variant,
      runs: scoped.length,
      avgScore: round(average(scoped.map((run) => run.score))),
      avgLatencyMs: round(average(scoped.map((run) => run.latencyMs))),
    };
  });
}

export function groupRunsByDay(runs: TestRun[]) {
  const buckets = new Map<string, { date: string; runs: number; avgScore: number; avgLatencyMs: number }>();

  for (const run of runs) {
    const date = run.createdAt.slice(0, 10);
    const existing = buckets.get(date);
    if (!existing) {
      buckets.set(date, {
        date,
        runs: 1,
        avgScore: run.score,
        avgLatencyMs: run.latencyMs,
      });
      continue;
    }

    const nextRuns = existing.runs + 1;
    existing.avgScore = round((existing.avgScore * existing.runs + run.score) / nextRuns);
    existing.avgLatencyMs = round((existing.avgLatencyMs * existing.runs + run.latencyMs) / nextRuns);
    existing.runs = nextRuns;
  }

  return [...buckets.values()].sort((a, b) => (a.date > b.date ? 1 : -1));
}
