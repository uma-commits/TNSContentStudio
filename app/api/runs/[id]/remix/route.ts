import { NextRequest } from "next/server";
import { loadRunWithPersona, runStage } from "@/lib/stage";
import { fetchSourceText } from "@/lib/providers/transcript";
import { chatJSON } from "@/lib/providers/openrouter";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loaded = loadRunWithPersona(id);
  if (!loaded) return new Response(JSON.stringify({ error: "run not found" }), { status: 404 });
  const { run } = loaded;

  if (!run.source_url) {
    return new Response(JSON.stringify({ error: "This run has no source URL to remix." }), { status: 400 });
  }

  return runStage(id, "remix_status", async () => {
    const source = await fetchSourceText(run.source_url);

    const system = `You analyze a viral short-form video (title + description/transcript) and extract its
reusable structure so it can be remixed for a different creator and niche. Be specific about
what makes the hook work, not just what it says.

Return ONLY a single JSON object, no prose, no markdown fences, with this exact shape:
{
  "source_hook": "string — the original opening line/hook, verbatim or closely paraphrased",
  "hook_pattern": "string — the reusable pattern behind the hook, e.g. 'confess a mistake then reveal the fix'",
  "structure": ["string", "..."] ,
  "remix_angle": "string — a one-sentence pitch for how to remix this into a personal finance video"
}`;

    const user = `Title: ${source.title}\n\nContent: ${source.text}`;

    const parsed = await chatJSON("script", system, user);

    return { remix_output: JSON.stringify(parsed) };
  });
}
