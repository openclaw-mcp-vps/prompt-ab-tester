import { NextResponse } from "next/server";
import { z } from "zod";

import { getTestAnalytics } from "@/lib/analytics";
import {
  deleteTest,
  getTestById,
  listRunsForTest,
  updateTest,
  type Provider,
  type TestStatus,
} from "@/lib/db";

export const runtime = "nodejs";

const updateSchema = z
  .object({
    name: z.string().min(3).max(120).optional(),
    description: z.string().max(400).optional(),
    provider: z.enum(["openai", "anthropic", "mock"]).optional(),
    model: z.string().min(2).max(120).optional(),
    status: z.enum(["draft", "running", "paused", "completed"]).optional(),
    trafficSplitA: z.number().int().min(5).max(95).optional(),
    variantAPrompt: z.string().min(20).optional(),
    variantBPrompt: z.string().min(20).optional(),
  })
  .strict();

async function getIdFromParams(context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  return params.id;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const id = await getIdFromParams(context);
    const test = await getTestById(id);

    if (!test) {
      return NextResponse.json({ error: "Test not found." }, { status: 404 });
    }

    const runs = await listRunsForTest(id, 100);
    return NextResponse.json({
      test,
      runs,
      analytics: getTestAnalytics(runs),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch test.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const id = await getIdFromParams(context);
    const body = await request.json();
    const input = updateSchema.parse(body);

    const updated = await updateTest(id, {
      ...input,
      provider: input.provider as Provider | undefined,
      status: input.status as TestStatus | undefined,
    });

    if (!updated) {
      return NextResponse.json({ error: "Test not found." }, { status: 404 });
    }

    return NextResponse.json({ test: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to update test.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const id = await getIdFromParams(context);
    const removed = await deleteTest(id);

    if (!removed) {
      return NextResponse.json({ error: "Test not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to delete test.",
      },
      { status: 500 },
    );
  }
}
