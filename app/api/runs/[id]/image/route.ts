import { NextRequest } from "next/server";
import { loadRunWithPersona, runStage } from "@/lib/stage";
import { generateImage } from "@/lib/providers/pollinations";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loaded = loadRunWithPersona(id);
  if (!loaded) return new Response(JSON.stringify({ error: "run not found" }), { status: 404 });
  const { run } = loaded;

  if (!run.image_prompt_output) {
    return new Response(JSON.stringify({ error: "Run the image prompt step first." }), { status: 400 });
  }

  const { final_prompt } = JSON.parse(run.image_prompt_output) as { final_prompt: string };

  return runStage(id, "image_status", async () => {
    const imagePath = await generateImage(final_prompt, id);
    return { image_path: imagePath };
  });
}
