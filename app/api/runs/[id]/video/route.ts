import { NextRequest } from "next/server";
import { loadRunWithPersona, runStage } from "@/lib/stage";
import { generateVideo } from "@/lib/providers/video";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loaded = loadRunWithPersona(id);
  if (!loaded) return new Response(JSON.stringify({ error: "run not found" }), { status: 404 });
  const { run } = loaded;

  if (!run.image_path || !run.voice_path || !run.voice_duration_seconds) {
    return new Response(JSON.stringify({ error: "Run the image and voice steps first." }), { status: 400 });
  }

  return runStage(id, "video_status", async () => {
    const videoPath = await generateVideo(run.image_path!, run.voice_path!, run.voice_duration_seconds!, id);
    return { video_path: videoPath };
  });
}
