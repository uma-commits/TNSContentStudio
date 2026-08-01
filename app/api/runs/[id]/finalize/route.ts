import { NextRequest } from "next/server";
import { loadRunWithPersona, runStage } from "@/lib/stage";
import { BASE_PATH } from "@/lib/basePath";
import path from "path";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loaded = loadRunWithPersona(id);
  if (!loaded) return new Response(JSON.stringify({ error: "run not found" }), { status: 404 });
  const { run } = loaded;

  const isCarousel = run.template === "carousel";
  if (isCarousel && !run.carousel_paths) {
    return new Response(JSON.stringify({ error: "Run the carousel step first." }), { status: 400 });
  }
  if (!isCarousel && !run.video_path) {
    return new Response(JSON.stringify({ error: "Run the video step first." }), { status: 400 });
  }

  const script = JSON.parse(run.script_output!) as { caption: string; hashtags: string[] };

  return runStage(id, "finalize_status", async () => {
    const summary = isCarousel
      ? {
          slide_urls: (JSON.parse(run.carousel_paths!) as string[]).map(
            (p) => `${BASE_PATH}/api/media/${id}/${path.basename(p)}`
          ),
          caption: script.caption,
          hashtags: script.hashtags,
          status: "ready_for_review",
        }
      : {
          video_url: `${BASE_PATH}/api/media/${id}/${path.basename(run.video_path!)}`,
          caption: script.caption,
          hashtags: script.hashtags,
          status: "ready_for_review",
        };
    return { final_output: JSON.stringify(summary) };
  });
}
