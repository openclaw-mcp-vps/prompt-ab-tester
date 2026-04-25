import { NextResponse } from "next/server";
import { z } from "zod";

import { getTestAnalytics, scoreOutput } from "@/lib/analytics";
import { executePrompt } from "@/lib/ai-providers";
import { createRun, getTestById, listRunsForTest, updateTest } from "@/lib/db";

export const runtime = "nodejs";

const executeSchema = z.object({
  testId: z.string().uuid(),
  input: z.string().min(1).max(8000),
  forceVariant: z.enum(["A", "B"]).optional(),
});

function chooseVariant(trafficSplitA: number) {
  return Math.random() * 100 < trafficSplitA ? "A" : "B";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = executeSchema.parse(body);

    const test = await getTestById(input.testId);
    if (!test) {
      return NextResponse.json({ error: "Test not found." }, { status: 404 });
    }

    if (test.status === "paused" || test.status === "completed") {
      return NextResponse.json(
        {
          error: `Test is ${test.status}. Update status to running before executing new traffic.`,
        },
        { status: 409 },
      );
    }

    const variant = input.forceVariant ?? chooseVariant(test.trafficSplitA);
    const prompt = variant === "A" ? test.variantAPrompt : test.variantBPrompt;

    const providerResult = await executePrompt({
      provider: test.provider,
      model: test.model,
      prompt,
      input: input.input,
    });

    const score = scoreOutput(input.input, providerResult.outputText);

    const run = await createRun({
      testId: test.id,
      variant,
      inputText: input.input,
      outputText: providerResult.outputText,
      provider: providerResult.provider,
      model: providerResult.model,
      latencyMs: providerResult.latencyMs,
      tokens: providerResult.tokens,
      score,
    });

    if (test.status === "draft") {
      await updateTest(test.id, { status: "running" });
    }

    const updatedRuns = await listRunsForTest(test.id, 150);

    return NextResponse.json({
      run,
      analytics: getTestAnalytics(updatedRuns),
      source: providerResult.source,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to execute prompt.",
      },
      { status: 500 },
    );
  }
}
