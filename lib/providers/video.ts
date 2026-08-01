import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { mediaDir } from "./paths";
import { CaptionSegment } from "../captionTiming";
import { timedDrawtextFilter } from "./captions";

const execFileAsync = promisify(execFile);

const FPS = 24;
const ZOOM_EXPR = `min(zoom+0.0009,1.15)`;

export type Scene = {
  // Exactly one of imagePath (still image, pan/zoomed) or clipPath (an
  // already-rendered clip, e.g. an animated chart from lib/providers/chart.ts)
  // should be set.
  imagePath?: string;
  clipPath?: string;
  durationSeconds: number;
  captionSegments?: CaptionSegment[];
};

function panZoomFilter(durationSeconds: number, captionSegments?: CaptionSegment[]): string {
  const frames = Math.max(1, Math.round(durationSeconds * FPS));
  let filter = `scale=1620:2880,zoompan=z='${ZOOM_EXPR}':d=${frames}:s=1080x1920:fps=${FPS},format=yuv420p`;
  if (captionSegments?.length) filter += `,${timedDrawtextFilter(captionSegments)}`;
  return filter;
}

// Free substitute for a paid lip-sync model: a slow pan/zoom (Ken Burns)
// over one or more generated images, muxed with the edge-tts voiceover,
// rendered as a 9:16 mp4 via ffmpeg. A single scene (talking_head,
// text_on_screen) renders and muxes audio in one ffmpeg call. Multiple
// scenes (hook_demo) render each as a silent clip, concat them, then mux
// audio once over the combined video — ffmpeg's zoompan filter can't
// target multiple inputs with different per-input timings in one pass.
export async function generateReelVideo(
  scenes: Scene[],
  audioPath: string,
  totalDurationSeconds: number,
  runId: string
): Promise<string> {
  const dir = mediaDir(runId);
  await fs.mkdir(dir, { recursive: true });
  const outPath = path.join(dir, "reel.mp4");

  if (scenes.length === 1 && scenes[0].imagePath) {
    const scene = scenes[0];
    await execFileAsync(
      "ffmpeg",
      [
        "-y",
        "-loop",
        "1",
        "-i",
        scene.imagePath!,
        "-i",
        audioPath,
        "-vf",
        panZoomFilter(scene.durationSeconds, scene.captionSegments),
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-tune",
        "stillimage",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-shortest",
        "-t",
        String(totalDurationSeconds),
        outPath,
      ],
      { timeout: 180_000 }
    );
    return outPath;
  }

  const clipPaths: string[] = [];
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const clipPath = path.join(dir, `scene-${i}.mp4`);

    if (scene.clipPath) {
      // Already a rendered clip (e.g. an animated chart) — just normalize
      // resolution/framerate/pix_fmt so it concats cleanly with the others.
      await execFileAsync(
        "ffmpeg",
        [
          "-y",
          "-i",
          scene.clipPath,
          "-vf",
          "scale=1080:1920,fps=24,format=yuv420p",
          "-t",
          String(scene.durationSeconds),
          "-c:v",
          "libx264",
          "-preset",
          "veryfast",
          "-pix_fmt",
          "yuv420p",
          clipPath,
        ],
        { timeout: 60_000 }
      );
      clipPaths.push(clipPath);
      continue;
    }

    await execFileAsync(
      "ffmpeg",
      [
        "-y",
        "-loop",
        "1",
        "-i",
        scene.imagePath!,
        "-vf",
        panZoomFilter(scene.durationSeconds, scene.captionSegments),
        "-t",
        String(scene.durationSeconds),
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-pix_fmt",
        "yuv420p",
        clipPath,
      ],
      { timeout: 180_000 }
    );
    clipPaths.push(clipPath);
  }

  const listPath = path.join(dir, "concat.txt");
  await fs.writeFile(listPath, clipPaths.map((p) => `file '${p}'`).join("\n"));
  const silentPath = path.join(dir, "silent.mp4");
  await execFileAsync("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", silentPath], {
    timeout: 60_000,
  });

  await execFileAsync(
    "ffmpeg",
    [
      "-y",
      "-i",
      silentPath,
      "-i",
      audioPath,
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-shortest",
      "-t",
      String(totalDurationSeconds),
      outPath,
    ],
    { timeout: 60_000 }
  );

  return outPath;
}
