import { NextRequest } from "next/server";
import { loadRunWithPersona, runStage } from "@/lib/stage";
import { generateReelVideo, Scene } from "@/lib/providers/video";
import { generateImage } from "@/lib/providers/nanobanana";
import { computeCaptionSegments, splitIntoBeats } from "@/lib/captionTiming";
import { extractStat, generateStatChartClip } from "@/lib/providers/chart";

type ScriptOutput = {
  hook: string;
  hook_on_screen_text: string;
  body: string[];
  close: string;
  cta: string;
};

const MIN_SCENE_SECONDS = 1.5;

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
  const { final_prompt: finalPrompt } = run.image_prompt_output
    ? (JSON.parse(run.image_prompt_output) as { final_prompt: string })
    : { final_prompt: "" };

  return runStage(id, "video_status", async () => {
    const scenes = await buildScenes(run.template, run.image_path!, finalPrompt, duration, script, id);
    const videoPath = await generateReelVideo(scenes, run.voice_path!, duration, id);
    return { video_path: videoPath };
  });
}

async function buildScenes(
  template: string,
  baseImagePath: string,
  finalPrompt: string,
  duration: number,
  script: ScriptOutput | null,
  runId: string
): Promise<Scene[]> {
  if ((template === "talking_head" || template === "text_on_screen") && script) {
    const parts = [script.hook, ...script.body, `${script.close} ${script.cta}`.trim()].filter(Boolean);
    const timedSegments = computeCaptionSegments(parts, duration);

    // Scene 0 always stays the persona's base image (identity anchor).
    // Any later line that cites a stat (a % or $ figure) gets an animated
    // chart scene instead of another generated image — a mix of character
    // shots and real motion-graphic data visuals, not one style throughout.
    // Every scene (both templates now — matching how virtually all modern
    // UGC shorts caption continuously) gets its text burned in as fast
    // ~4-word "beats" that pop on/off within the scene's hold time, instead
    // of one static block of text for the whole scene.
    const scenes: Scene[] = [];
    for (let i = 0; i < timedSegments.length; i++) {
      const seg = timedSegments[i];
      const sceneDuration = Math.max(MIN_SCENE_SECONDS, seg.end - seg.start);
      const stat = i > 0 ? extractStat(seg.text) : null;

      if (stat) {
        const shortLabel = splitIntoBeats(seg.text, 8)[0];
        const chartClipPath = await generateStatChartClip(stat, shortLabel, sceneDuration, runId, `chart-${i}.mp4`);
        scenes.push({ clipPath: chartClipPath, durationSeconds: sceneDuration });
        continue;
      }

      const imagePath =
        i === 0 ? baseImagePath : await generateImage(scenePrompt(finalPrompt, seg.text), runId, `scene-${i}.jpg`);
      const beats = splitIntoBeats(seg.text);
      const beatSegments = computeCaptionSegments(beats, sceneDuration);

      scenes.push({ imagePath, durationSeconds: sceneDuration, captionSegments: beatSegments });
    }
    return scenes;
  }

  if (template === "hook_demo" && script) {
    const hookDuration = Math.min(duration, Math.max(4, duration * 0.35));
    const demoDuration = duration - hookDuration;

    const demoPrompt = `Clean product demo mockup screen, UI overlay, bright modern app interface illustrating: ${script.body.join(
      " "
    )}`;
    const demoImagePath = await generateImage(demoPrompt, runId, "demo.jpg");

    const hookBeats = splitIntoBeats(script.hook_on_screen_text || script.hook);
    const demoBeats = splitIntoBeats(script.body.join(" "));

    return [
      {
        imagePath: baseImagePath,
        durationSeconds: hookDuration,
        captionSegments: computeCaptionSegments(hookBeats, hookDuration),
      },
      {
        imagePath: demoImagePath,
        durationSeconds: demoDuration,
        captionSegments: computeCaptionSegments(demoBeats, demoDuration),
      },
    ];
  }

  // Fallback (no script available yet, or an unrecognized template): plain
  // pan/zoom over the one base image, no burned captions.
  return [{ imagePath: baseImagePath, durationSeconds: duration }];
}

function scenePrompt(finalPrompt: string, sceneText: string): string {
  return finalPrompt
    ? `${finalPrompt} The scene depicts: ${sceneText}`
    : `A scene depicting: ${sceneText}`;
}
