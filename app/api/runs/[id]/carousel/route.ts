import { NextRequest } from "next/server";
import { loadRunWithPersona, runStage } from "@/lib/stage";
import { burnCaptionOnImage } from "@/lib/providers/captions";
import { mediaDir } from "@/lib/providers/paths";
import path from "path";

type ScriptOutput = { hook: string; body: string[]; close: string; cta: string };

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loaded = loadRunWithPersona(id);
  if (!loaded) return new Response(JSON.stringify({ error: "run not found" }), { status: 404 });
  const { run } = loaded;

  if (!run.image_path) {
    return new Response(JSON.stringify({ error: "Run the image step first." }), { status: 400 });
  }
  if (!run.script_output) {
    return new Response(JSON.stringify({ error: "Run the script step first." }), { status: 400 });
  }

  const script = JSON.parse(run.script_output) as ScriptOutput;
  const slides = [script.hook, ...script.body, script.cta].filter(Boolean);

  return runStage(id, "carousel_status", async () => {
    const dir = mediaDir(id);
    const slidePaths: string[] = [];
    for (let i = 0; i < slides.length; i++) {
      const outPath = path.join(dir, `slide-${i}.jpg`);
      await burnCaptionOnImage(run.image_path!, outPath, slides[i]);
      slidePaths.push(outPath);
    }
    return { carousel_paths: JSON.stringify(slidePaths) };
  });
}
