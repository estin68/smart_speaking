/**
 * WebLLM engine singleton — runs the local model in-browser via WebGPU.
 * Model weights are fetched once from the MLC CDN (hosted on Hugging Face)
 * and cached by the browser; inference happens entirely on-device.
 *
 * The ~6 MB @mlc-ai/web-llm library is loaded lazily (dynamic import) so the
 * initial app bundle stays small; it is only fetched when a session starts.
 */
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type * as WebLLMTypes from '@mlc-ai/web-llm';

export interface ModelOption {
  id: string;
  label: string;
  sizeHint: string;
}

/** Small, fast models that work well for short roleplay turns. */
export const MODEL_OPTIONS: ModelOption[] = [
  {
    id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    label: 'Llama 3.2 3B (best quality)',
    sizeHint: '~2.2 GB download',
  },
  {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    label: 'Llama 3.2 1B (balanced)',
    sizeHint: '~0.9 GB download',
  },
  {
    id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
    label: 'Qwen 2.5 0.5B (lightest)',
    sizeHint: '~0.5 GB download',
  },
];

export const DEFAULT_MODEL_ID = MODEL_OPTIONS[0].id;

const STORAGE_KEY_MODEL = 'smarty.modelId';

export function getSelectedModelId(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_MODEL);
    if (saved && MODEL_OPTIONS.some((m) => m.id === saved)) return saved;
  } catch {
    /* localStorage unavailable */
  }
  return DEFAULT_MODEL_ID;
}

export function setSelectedModelId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_MODEL, id);
  } catch {
    /* ignore */
  }
}

type ProgressCallback = (text: string, progressPct: number) => void;

let enginePromise: Promise<WebLLMTypes.MLCEngine> | null = null;
let cachedModelId: string | null = null;

/** Lazily creates (or returns) the engine for the given model. */
export function ensureEngine(
  onProgress?: ProgressCallback,
  modelId: string = getSelectedModelId()
): Promise<WebLLMTypes.MLCEngine> {
  // A different model was requested than what is loaded → reload.
  if (enginePromise && cachedModelId !== modelId) {
    enginePromise = null;
  }
  if (!enginePromise) {
    cachedModelId = modelId;
    let lastLoggedPct = -1;
    enginePromise = import('@mlc-ai/web-llm').then((webllm) =>
      webllm.CreateMLCEngine(modelId, {
        initProgressCallback: (report: WebLLMTypes.InitProgressReport) => {
          const pct = Math.round((report.progress ?? 0) * 100);
          if (onProgress && pct !== lastLoggedPct) {
            lastLoggedPct = pct;
            onProgress(report.text, pct);
          }
        },
      })
    );
    // Don't cache a failed init so a retry can start fresh.
    enginePromise.catch(() => {
      enginePromise = null;
      cachedModelId = null;
    });
  }
  return enginePromise;
}

/** Whether an engine is already warm (used to skip loading UI). */
export function isEngineReady(): boolean {
  return enginePromise !== null;
}

// ---------- Structured JSON generation ----------

function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  // Strip markdown code fences if the model adds them despite constraints.
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : trimmed;
  return JSON.parse(candidate);
}

/**
 * Runs a chat completion constrained to the given Zod schema and returns
 * validated, typed output. Retries once with a corrective nudge if the model
 * emits invalid JSON or fails validation.
 */
export async function chatJSON<T>(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  schema: z.ZodType<T>,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<T> {
  const engine = await ensureEngine();
  const schemaJson = zodToJsonSchema(schema, { target: 'openApi3' }) as Record<
    string,
    unknown
  >;

  const requestMessages = [...messages];
  let attempt = 0;
  let lastError: unknown = null;

  while (attempt < 2) {
    attempt += 1;
    try {
      // WebLLM supports OpenAI-style `response_format` with a JSON schema
      // (typed loosely here: the bundled types lag behind the runtime, and
      // create() also returns a streaming union type we never request).
      const request = {
        messages: requestMessages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 700,
        response_format: {
          type: 'json_schema',
          schema: schemaJson,
        },
      };
      const completion = (await engine.chat.completions.create(
        request as unknown as Parameters<
          typeof engine.chat.completions.create
        >[0]
      )) as { choices: Array<{ message?: { content?: string } }> };
      const raw = completion.choices[0]?.message?.content ?? '';
      return schema.parse(extractJson(raw));
    } catch (err) {
      lastError = err;
      requestMessages.push({
        role: 'assistant',
        content:
          (err instanceof Error ? err.message : String(err)).slice(0, 200) ||
          'Invalid output',
      });
      requestMessages.push({
        role: 'user',
        content:
          'Your previous response was not valid JSON matching the required schema. Respond again with ONLY the correct JSON object.',
      });
    }
  }
  throw new Error(
    `LLM failed to produce valid structured output after ${attempt} attempts: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}
