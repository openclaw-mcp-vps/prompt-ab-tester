import OpenAI from "openai";

import type { Provider } from "@/lib/db";

export type ExecutePromptInput = {
  provider: Provider;
  model: string;
  prompt: string;
  input: string;
};

export type ExecutePromptOutput = {
  outputText: string;
  tokens: number | null;
  latencyMs: number;
  provider: Provider;
  model: string;
  source: "api" | "mock";
};

function fallbackResponse(prompt: string, input: string) {
  const conciseMode = /concise|brief|short/i.test(prompt);
  const formatAsList = /bullet|list|steps/i.test(prompt);

  const normalizedInput = input.trim();
  if (!normalizedInput) {
    return "No input was provided. Add a sample user prompt to generate an evaluation output.";
  }

  if (formatAsList) {
    const lines = [
      `Goal: ${normalizedInput.slice(0, 160)}`,
      "Recommendation: Clarify constraints and intended tone before generating production output.",
      "Risk: Outputs drift when style instructions are broad and unscored.",
      "Action: Capture this response as a baseline and compare against the alternate variant.",
    ];
    return lines.map((line, index) => `${index + 1}. ${line}`).join("\n");
  }

  if (conciseMode) {
    return `Baseline response for input: "${normalizedInput.slice(0, 200)}". This result is stable enough to compare variant quality and latency.`;
  }

  return [
    `Here is an evaluated response for: "${normalizedInput.slice(0, 200)}".`,
    "The prompt generated structured guidance with clear next actions and minimal ambiguity.",
    "Use the run metrics to compare this output against the competing variant before promoting a winner.",
  ].join(" ");
}

async function runOpenAI(model: string, prompt: string, input: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const client = new OpenAI({ apiKey });

  const response = await client.chat.completions.create({
    model,
    temperature: 0.4,
    messages: [
      {
        role: "system",
        content: prompt,
      },
      {
        role: "user",
        content: input,
      },
    ],
  });

  const outputText = response.choices[0]?.message?.content?.trim() ?? "";

  return {
    outputText,
    tokens: response.usage?.total_tokens ?? null,
  };
}

async function runAnthropic(model: string, prompt: string, input: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return null;
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 800,
      system: prompt,
      messages: [
        {
          role: "user",
          content: input,
        },
      ],
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Anthropic API request failed: ${response.status} ${message}`);
  }

  const payload = (await response.json()) as {
    content?: Array<{ text?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };

  const outputText = payload.content?.map((chunk) => chunk.text ?? "").join("\n").trim() ?? "";
  const inputTokens = payload.usage?.input_tokens ?? 0;
  const outputTokens = payload.usage?.output_tokens ?? 0;

  return {
    outputText,
    tokens: inputTokens + outputTokens,
  };
}

export async function executePrompt({ provider, model, prompt, input }: ExecutePromptInput): Promise<ExecutePromptOutput> {
  const startedAt = Date.now();

  try {
    if (provider === "openai") {
      const result = await runOpenAI(model, prompt, input);
      if (result?.outputText) {
        return {
          provider,
          model,
          outputText: result.outputText,
          tokens: result.tokens,
          latencyMs: Date.now() - startedAt,
          source: "api",
        };
      }
    }

    if (provider === "anthropic") {
      const result = await runAnthropic(model, prompt, input);
      if (result?.outputText) {
        return {
          provider,
          model,
          outputText: result.outputText,
          tokens: result.tokens,
          latencyMs: Date.now() - startedAt,
          source: "api",
        };
      }
    }
  } catch {
    // Falls back to deterministic local output when provider calls fail.
  }

  return {
    provider,
    model,
    outputText: fallbackResponse(prompt, input),
    tokens: null,
    latencyMs: Date.now() - startedAt,
    source: "mock",
  };
}
