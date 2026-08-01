import { NextRequest } from "next/server";
import { loadRunWithPersona, runStage } from "@/lib/stage";
import { generateReelVideo, Scene } from "@/lib/providers/video";
import { generateImage } from "@/lib/providers/pollinations";
import { computeCaptionSegments } from "@/lib/captionTiming";

type ScriptOutput = {
  hook: string;
  hook_on_screen_text: string;
  body: string[];
  close: string;
  cta: string;
};

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loaded = loadRunWithPersona(id);
  if (!loaded) return new Response(JSON.stringify({ error: "run not found" }), { status: 404 });
  const { run } = loaded;

  if (!run.image_path || !run.voice_path || !run.voice_duration_seconds) {
    return new Response(JSON.stringify({ error: "Run the image and voice steps first." }), { status: 400 });
  }

  const duration = run.voice_duration_seconds;
  const script = run.script_output ? (JSON.parse(run.script_output) as ScriptOutput) : null;

  return runStage(id, "video_status", async () => {
    const scenes = await buildScenes(run.template, run.image_path!, duration, script, id);
    const videoPath = await generateReelVideo(scenes, run.voice_path!, duration, id);
    return { video_path: videoPath };
  });
}

async function buildScenes(
  template: string,
  imagePath: string,
  duration: number,
  script: ScriptOutput | null,
  runId: string
): Promise<Scene[]> {
  if (template === "text_on_screen" && script) {
    const segments = computeCaptionSegments([script.hook, ...script.body, script.close, script.cta], duration);
    return [{ imagePath, durationSeconds: duration, captionSegments: segments }];
  }

  if (template === "hook_demo" && script) {
    const hookDuration = Math.min(duration, Math.max(4, duration * 0.35));
    const demoDuration = duration - hookDuration;

    const demoPrompt = `Clean product demo mockup screen, UI overlay, bright modern app interface illustrating: ${script.body.join(
      " "
    )}`;
    const demoImagePath = await generateImage(demoPrompt, runId, "demo.jpg");

    return [
      {
        imagePath,
        durationSeconds: hookDuration,
        captionSegments: [{ text: script.hook_on_screen_text || script.hook, start: 0, end: hookDuration }],
      },
      {
        imagePath: demoImagePath,
        durationSeconds: demoDuration,
        captionSegments: [{ text: script.body.join(" "), start: 0, end: demoDuration }],
      },
    ];
  }

  // talking_head (default): plain pan/zoom, no burned captions.
  return [{ imagePath, durationSeconds: duration }];
}
