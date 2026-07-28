import { NextRequest } from "next/server";
import { loadRunWithPersona, runStage } from "@/lib/stage";
import { chatJSON } from "@/lib/providers/openrouter";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loaded = loadRunWithPersona(id);
  if (!loaded) return new Response(JSON.stringify({ error: "run not found" }), { status: 404 });
  const { run, persona } = loaded;

  if (!run.script_output) {
    return new Response(JSON.stringify({ error: "Run the script step first." }), { status: 400 });
  }

  const script = JSON.parse(run.script_output) as { visual_rationale: string; hook: string };
  const styles = JSON.parse(persona.visual_styles) as { name: string; prompt: string }[];
  const style = styles[Math.floor(Math.random() * styles.length)];

  const system = `You write structured photorealistic image-generation prompts for a consistent AI-influencer character.
Fixed physical description (must be reflected precisely every time, for character consistency): ${persona.physical_description}

Return ONLY a single JSON object, no prose, no markdown fences, with this exact shape:
{
  "subject": "string",
  "attire": "string",
  "environment": "string",
  "lighting_and_mood": "string",
  "technical_specs": "string",
  "keywords": ["string", "..."],
  "negative_prompt": "string"
}`;

  const user = `Visual style to use: ${style.name} — ${style.prompt}\nScene rationale from the script: ${script.visual_rationale}\nHook line for tonal reference: ${script.hook}`;

  return runStage(id, "image_prompt_status", async () => {
    const parsed = (await chatJSON("imagePrompt", system, user)) as {
      subject: string;
      attire: string;
      environment: string;
      lighting_and_mood: string;
      technical_specs: string;
      keywords: string[];
      negative_prompt: string;
    };

    const finalPrompt = [
      persona.physical_description,
      parsed.subject,
      `Wearing: ${parsed.attire}`,
      `Setting: ${parsed.environment}`,
      parsed.lighting_and_mood,
      parsed.technical_specs,
      parsed.keywords?.join(", "),
    ]
      .filter(Boolean)
      .join(". ");

    return {
      image_prompt_output: JSON.stringify({ ...parsed, style: style.name, final_prompt: finalPrompt }),
    };
  });
}
