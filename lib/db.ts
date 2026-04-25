import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";

export type Provider = "openai" | "anthropic" | "mock";
export type TestStatus = "draft" | "running" | "paused" | "completed";

export type PromptTest = {
  id: string;
  name: string;
  description: string;
  provider: Provider;
  model: string;
  status: TestStatus;
  trafficSplitA: number;
  variantAPrompt: string;
  variantBPrompt: string;
  createdAt: string;
  updatedAt: string;
};

export type TestRun = {
  id: string;
  testId: string;
  variant: "A" | "B";
  inputText: string;
  outputText: string;
  provider: Provider;
  model: string;
  latencyMs: number;
  tokens: number | null;
  score: number;
  createdAt: string;
};

export type Purchase = {
  email: string;
  checkoutId: string;
  source: string;
  createdAt: string;
};

type DataStore = {
  tests: PromptTest[];
  runs: TestRun[];
  purchases: Purchase[];
};

export type CreatePromptTestInput = {
  name: string;
  description?: string;
  provider: Provider;
  model: string;
  trafficSplitA: number;
  variantAPrompt: string;
  variantBPrompt: string;
};

export type UpdatePromptTestInput = Partial<
  Omit<CreatePromptTestInput, "provider"> & {
    provider: Provider;
    status: TestStatus;
  }
>;

export type CreateTestRunInput = {
  testId: string;
  variant: "A" | "B";
  inputText: string;
  outputText: string;
  provider: Provider;
  model: string;
  latencyMs: number;
  tokens: number | null;
  score: number;
};

const storeDir = path.join(process.cwd(), ".data");
const storePath = path.join(storeDir, "prompt-ab-tester.json");

let pool: Pool | null = null;
let schemaEnsured = false;

function isPostgresEnabled() {
  return Boolean(process.env.DATABASE_URL);
}

function getPool() {
  if (!isPostgresEnabled()) {
    return null;
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30_000,
    });
  }

  return pool;
}

function mapPromptTestRow(row: Record<string, unknown>): PromptTest {
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description ?? ""),
    provider: row.provider as Provider,
    model: String(row.model),
    status: row.status as TestStatus,
    trafficSplitA: Number(row.traffic_split_a),
    variantAPrompt: String(row.variant_a_prompt),
    variantBPrompt: String(row.variant_b_prompt),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

function mapTestRunRow(row: Record<string, unknown>): TestRun {
  return {
    id: String(row.id),
    testId: String(row.test_id),
    variant: row.variant as "A" | "B",
    inputText: String(row.input_text),
    outputText: String(row.output_text),
    provider: row.provider as Provider,
    model: String(row.model),
    latencyMs: Number(row.latency_ms),
    tokens: row.tokens === null ? null : Number(row.tokens),
    score: Number(row.score),
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

function mapPurchaseRow(row: Record<string, unknown>): Purchase {
  return {
    email: String(row.email),
    checkoutId: String(row.checkout_id),
    source: String(row.source),
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

async function ensureSchema() {
  const db = getPool();
  if (!db || schemaEnsured) {
    return;
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS prompt_tests (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      status TEXT NOT NULL,
      traffic_split_a INTEGER NOT NULL,
      variant_a_prompt TEXT NOT NULL,
      variant_b_prompt TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS test_runs (
      id TEXT PRIMARY KEY,
      test_id TEXT NOT NULL REFERENCES prompt_tests(id) ON DELETE CASCADE,
      variant TEXT NOT NULL,
      input_text TEXT NOT NULL,
      output_text TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      latency_ms INTEGER NOT NULL,
      tokens INTEGER,
      score NUMERIC(5,2) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_test_runs_test_id_created_at
    ON test_runs(test_id, created_at DESC);
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS purchases (
      email TEXT PRIMARY KEY,
      checkout_id TEXT NOT NULL,
      source TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  schemaEnsured = true;
}

async function readStore(): Promise<DataStore> {
  await fs.mkdir(storeDir, { recursive: true });

  try {
    const content = await fs.readFile(storePath, "utf8");
    return JSON.parse(content) as DataStore;
  } catch {
    const seed: DataStore = {
      tests: [],
      runs: [],
      purchases: [],
    };
    await fs.writeFile(storePath, JSON.stringify(seed, null, 2));
    return seed;
  }
}

async function writeStore(store: DataStore) {
  await fs.mkdir(storeDir, { recursive: true });
  await fs.writeFile(storePath, JSON.stringify(store, null, 2));
}

export async function getStorageMode() {
  return isPostgresEnabled() ? "postgres" : "filesystem";
}

export async function createTest(input: CreatePromptTestInput): Promise<PromptTest> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const test: PromptTest = {
    id,
    name: input.name,
    description: input.description ?? "",
    provider: input.provider,
    model: input.model,
    status: "draft",
    trafficSplitA: input.trafficSplitA,
    variantAPrompt: input.variantAPrompt,
    variantBPrompt: input.variantBPrompt,
    createdAt: now,
    updatedAt: now,
  };

  const db = getPool();
  if (db) {
    await ensureSchema();
    const result = await db.query(
      `
        INSERT INTO prompt_tests (
          id, name, description, provider, model, status, traffic_split_a,
          variant_a_prompt, variant_b_prompt, created_at, updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        RETURNING *;
      `,
      [
        test.id,
        test.name,
        test.description,
        test.provider,
        test.model,
        test.status,
        test.trafficSplitA,
        test.variantAPrompt,
        test.variantBPrompt,
        test.createdAt,
        test.updatedAt,
      ],
    );

    return mapPromptTestRow(result.rows[0] as Record<string, unknown>);
  }

  const store = await readStore();
  store.tests.unshift(test);
  await writeStore(store);
  return test;
}

export async function listTests(): Promise<PromptTest[]> {
  const db = getPool();
  if (db) {
    await ensureSchema();
    const result = await db.query("SELECT * FROM prompt_tests ORDER BY created_at DESC;");
    return result.rows.map((row) => mapPromptTestRow(row as Record<string, unknown>));
  }

  const store = await readStore();
  return [...store.tests].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getTestById(id: string): Promise<PromptTest | null> {
  const db = getPool();
  if (db) {
    await ensureSchema();
    const result = await db.query("SELECT * FROM prompt_tests WHERE id = $1 LIMIT 1;", [id]);
    if ((result.rowCount ?? 0) === 0) {
      return null;
    }
    return mapPromptTestRow(result.rows[0] as Record<string, unknown>);
  }

  const store = await readStore();
  return store.tests.find((test) => test.id === id) ?? null;
}

export async function updateTest(id: string, input: UpdatePromptTestInput): Promise<PromptTest | null> {
  const db = getPool();
  const now = new Date().toISOString();

  if (db) {
    await ensureSchema();

    const updates: string[] = [];
    const values: unknown[] = [];

    if (input.name !== undefined) {
      updates.push(`name = $${updates.length + 1}`);
      values.push(input.name);
    }
    if (input.description !== undefined) {
      updates.push(`description = $${updates.length + 1}`);
      values.push(input.description);
    }
    if (input.provider !== undefined) {
      updates.push(`provider = $${updates.length + 1}`);
      values.push(input.provider);
    }
    if (input.model !== undefined) {
      updates.push(`model = $${updates.length + 1}`);
      values.push(input.model);
    }
    if (input.status !== undefined) {
      updates.push(`status = $${updates.length + 1}`);
      values.push(input.status);
    }
    if (input.trafficSplitA !== undefined) {
      updates.push(`traffic_split_a = $${updates.length + 1}`);
      values.push(input.trafficSplitA);
    }
    if (input.variantAPrompt !== undefined) {
      updates.push(`variant_a_prompt = $${updates.length + 1}`);
      values.push(input.variantAPrompt);
    }
    if (input.variantBPrompt !== undefined) {
      updates.push(`variant_b_prompt = $${updates.length + 1}`);
      values.push(input.variantBPrompt);
    }

    updates.push(`updated_at = $${updates.length + 1}`);
    values.push(now);
    values.push(id);

    const result = await db.query(
      `
        UPDATE prompt_tests
        SET ${updates.join(", ")}
        WHERE id = $${values.length}
        RETURNING *;
      `,
      values,
    );

    if ((result.rowCount ?? 0) === 0) {
      return null;
    }

    return mapPromptTestRow(result.rows[0] as Record<string, unknown>);
  }

  const store = await readStore();
  const index = store.tests.findIndex((test) => test.id === id);

  if (index === -1) {
    return null;
  }

  const current = store.tests[index];
  const updated: PromptTest = {
    ...current,
    ...input,
    description: input.description ?? current.description,
    updatedAt: now,
  };

  store.tests[index] = updated;
  await writeStore(store);
  return updated;
}

export async function deleteTest(id: string): Promise<boolean> {
  const db = getPool();
  if (db) {
    await ensureSchema();
    const result = await db.query("DELETE FROM prompt_tests WHERE id = $1;", [id]);
    return (result.rowCount ?? 0) > 0;
  }

  const store = await readStore();
  const initialCount = store.tests.length;
  store.tests = store.tests.filter((test) => test.id !== id);
  store.runs = store.runs.filter((run) => run.testId !== id);

  await writeStore(store);
  return store.tests.length < initialCount;
}

export async function createRun(input: CreateTestRunInput): Promise<TestRun> {
  const run: TestRun = {
    id: crypto.randomUUID(),
    testId: input.testId,
    variant: input.variant,
    inputText: input.inputText,
    outputText: input.outputText,
    provider: input.provider,
    model: input.model,
    latencyMs: input.latencyMs,
    tokens: input.tokens,
    score: input.score,
    createdAt: new Date().toISOString(),
  };

  const db = getPool();
  if (db) {
    await ensureSchema();
    const result = await db.query(
      `
        INSERT INTO test_runs (
          id, test_id, variant, input_text, output_text, provider, model,
          latency_ms, tokens, score, created_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        RETURNING *;
      `,
      [
        run.id,
        run.testId,
        run.variant,
        run.inputText,
        run.outputText,
        run.provider,
        run.model,
        run.latencyMs,
        run.tokens,
        run.score,
        run.createdAt,
      ],
    );

    return mapTestRunRow(result.rows[0] as Record<string, unknown>);
  }

  const store = await readStore();
  store.runs.unshift(run);
  await writeStore(store);
  return run;
}

export async function listRunsForTest(testId: string, limit = 50): Promise<TestRun[]> {
  const db = getPool();
  if (db) {
    await ensureSchema();
    const result = await db.query(
      "SELECT * FROM test_runs WHERE test_id = $1 ORDER BY created_at DESC LIMIT $2;",
      [testId, limit],
    );

    return result.rows.map((row) => mapTestRunRow(row as Record<string, unknown>));
  }

  const store = await readStore();
  return store.runs
    .filter((run) => run.testId === testId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, limit);
}

export async function listAllRuns(limit = 500): Promise<TestRun[]> {
  const db = getPool();
  if (db) {
    await ensureSchema();
    const result = await db.query("SELECT * FROM test_runs ORDER BY created_at DESC LIMIT $1;", [limit]);
    return result.rows.map((row) => mapTestRunRow(row as Record<string, unknown>));
  }

  const store = await readStore();
  return [...store.runs].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, limit);
}

export async function upsertPurchase(email: string, checkoutId: string, source: string): Promise<Purchase> {
  const normalizedEmail = email.trim().toLowerCase();
  const purchase: Purchase = {
    email: normalizedEmail,
    checkoutId,
    source,
    createdAt: new Date().toISOString(),
  };

  const db = getPool();
  if (db) {
    await ensureSchema();
    const result = await db.query(
      `
        INSERT INTO purchases (email, checkout_id, source, created_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (email)
        DO UPDATE SET checkout_id = EXCLUDED.checkout_id, source = EXCLUDED.source
        RETURNING *;
      `,
      [purchase.email, purchase.checkoutId, purchase.source, purchase.createdAt],
    );

    return mapPurchaseRow(result.rows[0] as Record<string, unknown>);
  }

  const store = await readStore();
  const index = store.purchases.findIndex((entry) => entry.email === normalizedEmail);
  if (index === -1) {
    store.purchases.push(purchase);
  } else {
    store.purchases[index] = {
      ...store.purchases[index],
      checkoutId,
      source,
    };
  }

  await writeStore(store);
  return purchase;
}

export async function findPurchaseByEmail(email: string): Promise<Purchase | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const db = getPool();
  if (db) {
    await ensureSchema();
    const result = await db.query("SELECT * FROM purchases WHERE email = $1 LIMIT 1;", [normalizedEmail]);
    if ((result.rowCount ?? 0) === 0) {
      return null;
    }

    return mapPurchaseRow(result.rows[0] as Record<string, unknown>);
  }

  const store = await readStore();
  return store.purchases.find((entry) => entry.email === normalizedEmail) ?? null;
}

export async function healthcheck() {
  const mode = await getStorageMode();
  if (mode === "postgres") {
    const db = getPool();
    if (!db) {
      return {
        status: "degraded",
        mode,
      };
    }

    await db.query("SELECT 1;");
  }

  return {
    status: "ok",
    mode,
  };
}
