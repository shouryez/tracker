import "server-only";

// One small client for the language model behind WA autopsy and Spot your bug
// (FINAL-FEATURES A2, A3). NVIDIA's API is OpenAI-compatible. The key lives only in
// server env (NVIDIA_API_KEY); without it every AI feature quietly stays off.

const ENDPOINT = "https://integrate.api.nvidia.com/v1/chat/completions";
// Fast and accurate on our autopsy samples (about 1 s with thinking off). Qwen 2.5 Coder
// was retired on NVIDIA in May 2026.
const DEFAULT_MODEL = "nvidia/nemotron-3.5-lightning-30b-a3b";
const TIMEOUT_MS = 45_000;

export const aiEnabled = () => Boolean(process.env.NVIDIA_API_KEY);
export const aiModel = () => process.env.NVIDIA_MODEL || DEFAULT_MODEL;

/**
 * Asks the model for one JSON object. Returns null when AI is off, the call fails or the
 * reply isn't JSON; callers treat null as "no result" and never show an error for it.
 */
export async function chatJson(
  system: string,
  user: string,
  opts: { maxTokens?: number; temperature?: number } = {},
): Promise<Record<string, unknown> | null> {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: aiModel(),
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: opts.temperature ?? 0.2,
        max_tokens: opts.maxTokens ?? 600,
        // Reasoning models otherwise spend the whole token budget thinking and reply with
        // no content. Models without a thinking switch ignore this.
        chat_template_kwargs: { enable_thinking: false },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error("[ai] request failed", res.status);
      return null;
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return parseJsonObject(data.choices?.[0]?.message?.content ?? "");
  } catch (err) {
    console.error("[ai] request error", err instanceof Error ? err.name : "unknown");
    return null;
  }
}

/** The first {...} object in a reply, which may come wrapped in prose or a ```json fence. */
export function parseJsonObject(text: string): Record<string, unknown> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const v = JSON.parse(text.slice(start, end + 1)) as unknown;
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
