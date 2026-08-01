// Free-tier-only OpenRouter chat client. Tries each model in `models` in
// order, falling back to the next one on a rate-limit (429) or transient
// error — free models get squeezed hard, so a single model is not reliable
// enough on its own.

const FREE_MODELS = {
  script: [
    "nvidia/nemotron-nano-9b-v2:free",
    "google/gemma-3-27b-it:free",
    "openai/gpt-oss-20b:free",
  ],
  imagePrompt: [
    "google/gemma-3-27b-it:free",
    "openai/gpt-oss-20b:free",
    "nvidia/nemotron-nano-9b-v2:free",
  ],
  review: [
    "google/gemma-3-27b-it:free",
    "nvidia/nemotron-nano-9b-v2:free",
    "openai/gpt-oss-20b:free",
  ],
  brief: [
    "google/gemma-3-27b-it:free",
    "openai/gpt-oss-20b:free",
    "nvidia/nemotron-nano-9b-v2:free",
  ],
} as const;

export type ChatTask = keyof typeof FREE_MODELS;

export async function chatJSON(task: ChatTask, systemPrompt: string, userPrompt: string): Promise<unknown> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  const models = FREE_MODELS[task];
  let lastError: unknown;

  for (const model of models) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        signal: AbortSignal.timeout(110_000), // free-tier models can take 60-90s+ to respond
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://www.truenorthlink.com/labs/ugc_content_yorbi",
          "X-Title": "Content Studio",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.9,
        }),
      });

      if (res.status === 429 || res.status === 503) {
        lastError = new Error(`${model} rate-limited (${res.status})`);
        continue;
      }
      if (!res.ok) {
        lastError = new Error(`${model} failed: ${res.status} ${await res.text()}`);
        continue;
      }

      const data = await res.json();
      const content: string | undefined = data?.choices?.[0]?.message?.content;
      if (!content) {
        lastError = new Error(`${model} returned no content`);
        continue;
      }

      return extractJSON(content);
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(`All free OpenRouter models failed for task "${task}": ${String(lastError)}`);
}

function extractJSON(content: string): unknown {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : content;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  const candidate = start !== -1 && end !== -1 ? raw.slice(start, end + 1) : raw;
  return JSON.parse(candidate);
}
