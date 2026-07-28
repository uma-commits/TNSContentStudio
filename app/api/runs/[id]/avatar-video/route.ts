import { NextRequest } from "next/server";
import { loadRunWithPersona, runStage } from "@/lib/stage";
import { generateAvatarVideo } from "@/lib/providers/heygen";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loaded = loadRunWithPersona(id);
  if (!loaded) return new Response(JSON.stringify({ error: "run not found" }), { status: 404 });
  const { run, persona } = loaded;

  if (persona.video_engine !== "heygen") {
    return new Response(JSON.stringify({ error: "This persona is not configured for the HeyGen engine." }), {
      status: 400,
    });
  }
  if (!run.script_output) {
    return new Response(JSON.stringify({ error: "Run the script step first." }), { status: 400 });
  }

  const { voiceover_text } = JSON.parse(run.script_output) as { voiceover_text: string };

  return runStage(id, "video_status", async () => {
    const videoPath = await generateAvatarVideo(
      voiceover_text,
      persona.heygen_avatar_id,
      persona.heygen_voice_id,
      id
    );
    return { video_path: videoPath };
  });
}
