"use client";

import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PromptEditor } from "@/components/ui/prompt-editor";

type TestCreatorProps = {
  onCreated?: (id: string) => void;
};

const DEFAULT_A =
  "You are a support assistant. Answer the user with direct steps and one final recommendation. Keep the response under 120 words.";
const DEFAULT_B =
  "You are a support assistant for SaaS teams. Diagnose root cause first, then provide a numbered action plan and a one-sentence recap. Keep it under 120 words.";

export function TestCreator({ onCreated }: TestCreatorProps) {
  const [name, setName] = useState("Support Assistant Prompt Test");
  const [description, setDescription] = useState(
    "Measure whether structured diagnosis + action plan improves answer quality and consistency.",
  );
  const [provider, setProvider] = useState<"openai" | "anthropic" | "mock">("mock");
  const [model, setModel] = useState("gpt-4.1-mini");
  const [trafficSplitA, setTrafficSplitA] = useState(50);
  const [variantAPrompt, setVariantAPrompt] = useState(DEFAULT_A);
  const [variantBPrompt, setVariantBPrompt] = useState(DEFAULT_B);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!name.trim() || !variantAPrompt.trim() || !variantBPrompt.trim()) {
      setError("Name and both prompt variants are required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/tests", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
          provider,
          model,
          trafficSplitA,
          variantAPrompt,
          variantBPrompt,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Failed to create test.");
      }

      const payload = (await response.json()) as { test: { id: string } };
      onCreated?.(payload.test.id);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unexpected error creating test.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="border-sky-500/25 bg-gradient-to-br from-zinc-900/95 to-zinc-950">
      <CardTitle>Create a New Prompt Experiment</CardTitle>
      <CardDescription className="mt-1">
        Define two prompt variants, control traffic split, and start collecting scored runs in minutes.
      </CardDescription>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-200" htmlFor="test-name">
              Test Name
            </label>
            <Input id="test-name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-200" htmlFor="test-description">
              Description
            </label>
            <Input id="test-description" value={description} onChange={(event) => setDescription(event.target.value)} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-200" htmlFor="provider">
              Provider
            </label>
            <select
              id="provider"
              value={provider}
              onChange={(event) => setProvider(event.target.value as "openai" | "anthropic" | "mock")}
              className="h-11 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              <option value="mock">Mock (local)</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-200" htmlFor="model">
              Model
            </label>
            <Input id="model" value={model} onChange={(event) => setModel(event.target.value)} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-200" htmlFor="split">
              Traffic to Variant A ({trafficSplitA}%)
            </label>
            <input
              id="split"
              type="range"
              min={5}
              max={95}
              value={trafficSplitA}
              onChange={(event) => setTrafficSplitA(Number(event.target.value))}
              className="h-11 w-full accent-sky-500"
            />
          </div>
        </div>

        <PromptEditor
          variantAPrompt={variantAPrompt}
          variantBPrompt={variantBPrompt}
          onVariantAChange={setVariantAPrompt}
          onVariantBChange={setVariantBPrompt}
        />

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating test..." : "Create Test"}
        </Button>
      </form>
    </Card>
  );
}
