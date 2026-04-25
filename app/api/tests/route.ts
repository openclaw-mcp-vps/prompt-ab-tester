import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createTest,
  listAllRuns,
  listTests,
  type Provider,
} from "@/lib/db";
import {
  getOverview,
  getTestAnalytics,
  getVariantLeaderboard,
  groupRunsByDay,
} from "@/lib/analytics";

export const runtime = "nodejs";

const createTestSchema = z.object({
  name: z.string().min(3).max(120),
  description: z.string().max(400).optional().default(""),
  provider: z.enum(["openai", "anthropic", "mock"]),
  model: z.string().min(2).max(120),
  trafficSplitA: z.number().int().min(5).max(95),
  variantAPrompt: z.string().min(20),
  variantBPrompt: z.string().min(20),
});

export async function GET() {
  try {
    const [tests, runs] = await Promise.all([listTests(), listAllRuns(1000)]);

    const testsWithAnalytics = tests.map((test) => {
      const scopedRuns = runs.filter((run) => run.testId === test.id);
      return {
        ...test,
        analytics: getTestAnalytics(scopedRuns),
      };
    });

    return NextResponse.json({
      tests: testsWithAnalytics,
      overview: getOverview(tests, runs),
      variantPerformance: getVariantLeaderboard(runs),
      dailyPerformance: groupRunsByDay(runs),
      recentRuns: runs.slice(0, 20),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to list tests.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = createTestSchema.parse(body);

    const test = await createTest({
      name: input.name,
      description: input.description,
      provider: input.provider as Provider,
      model: input.model,
      trafficSplitA: input.trafficSplitA,
      variantAPrompt: input.variantAPrompt,
      variantBPrompt: input.variantBPrompt,
    });

    return NextResponse.json({ test }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create test.",
      },
      { status: 500 },
    );
  }
}
