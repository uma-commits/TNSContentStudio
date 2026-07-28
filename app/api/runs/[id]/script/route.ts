import { NextRequest } from "next/server";
import { loadRunWithPersona, runStage } from "@/lib/stage";
import { chatJSON } from "@/lib/providers/openrouter";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loaded = loadRunWithPersona(id);
  if (!loaded) return new Response(JSON.stringify({ error: "run not found" }), { status: 404 });
  const { run, persona } = loaded;

  const buckets = JSON.parse(persona.content_buckets) as { name: string; description: string }[];
  const bucket = buckets.find((b) => b.name === run.content_bucket) ?? buckets[0];

  const system = `You write short-form talking-head reel scripts for an AI-influencer character.
Persona: ${persona.name}.
Backstory: ${persona.backstory}
Voice DNA (tone/pacing/delivery): ${persona.voice_dna}
Slang and expressions to draw from: ${persona.slang || "none specified"}

Hard requirements:
- 45-55 seconds spoken, 100-130 words total.
- Structure: hook (with on-screen text), 2-3 body sections, a close, and a CTA.
- Stay entirely in character. Never break the fourth wall about being AI.
- Return ONLY a single JSON object, no prose, no markdown fences, with this exact shape:
{
  "hook": "string",
  "hook_on_screen_text": "string",
  "body": ["string", "string"],
  "close": "string",
  "cta": "string",
  "caption": "string",
  "hashtags": ["string", "..."],
  "visual_rationale": "string"
}`;

  const user = `Content bucket: ${bucket.name} — ${bucket.description}\nTopic: ${run.topic}`;

  return runStage(id, "script_status", async () => {
    const parsed = (await chatJSON("script", system, user)) as {
      hook: string;
      hook_on_screen_text: string;
      body: string[];
      close: string;
      cta: string;
      caption: string;
      hashtags: string[];
      visual_rationale: string;
    };

    const voiceoverText = [parsed.hook, ...parsed.body, parsed.close, parsed.cta].join(" ");

    return {
      script_output: JSON.stringify({ ...parsed, voiceover_text: voiceoverText }),
    };
  });
}
