"use client";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type PromptEditorProps = {
  variantAPrompt: string;
  variantBPrompt: string;
  onVariantAChange: (value: string) => void;
  onVariantBChange: (value: string) => void;
};

export function PromptEditor({
  variantAPrompt,
  variantBPrompt,
  onVariantAChange,
  onVariantBChange,
}: PromptEditorProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardTitle>Variant A</CardTitle>
        <CardDescription className="mt-1">
          Keep instructions concise and deterministic to reduce response drift.
        </CardDescription>
        <Textarea
          className="mt-4"
          value={variantAPrompt}
          onChange={(event) => onVariantAChange(event.target.value)}
          placeholder="Write the control prompt used as baseline."
        />
      </Card>
      <Card>
        <CardTitle>Variant B</CardTitle>
        <CardDescription className="mt-1">
          Test one deliberate improvement such as added context, format rules, or examples.
        </CardDescription>
        <Textarea
          className="mt-4"
          value={variantBPrompt}
          onChange={(event) => onVariantBChange(event.target.value)}
          placeholder="Write the challenger prompt."
        />
      </Card>
    </div>
  );
}
