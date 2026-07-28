import { NextRequest } from "next/server";
import { loadRunWithPersona, runStage } from "@/lib/stage";
import { generateVoice } from "@/lib/providers/edge-tts";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loaded = loadRunWithPersona(id);
  if (!loaded) return new Response(JSON.stringify({ error: "run not found" }), { status: 404 });
  const { run, persona } = loaded;

  if (!run.script_output) {
    return new Response(JSON.stringify({ error: "Run the script step first." }), { status: 400 });
  }

  const { voiceover_text } = JSON.parse(run.script_output) as { voiceover_text: string };

  return runStage(id, "voice_status", async () => {
    const { path: voicePath, durationSeconds } = await generateVoice(voiceover_text, persona.edge_voice, id);
    return { voice_path: voicePath, voice_duration_seconds: durationSeconds };
  });
}
