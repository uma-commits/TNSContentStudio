import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { mediaDir } from "./paths";

const execFileAsync = promisify(execFile);

// Free substitute for a paid lip-sync model: a slow pan/zoom (Ken Burns)
// over the generated character portrait, muxed with the edge-tts
// voiceover, rendered as a 9:16 mp4 via ffmpeg.
export async function generateVideo(
  imagePath: string,
  audioPath: string,
  durationSeconds: number,
  runId: string
): Promise<string> {
  const dir = mediaDir(runId);
  await fs.mkdir(dir, { recursive: true });
  const outPath = path.join(dir, "reel.mp4");

  // 24fps and a 1.5x (not 4x) upscale before zoompan — the 2160x3840 version
  // took ~2min of CPU to encode a 39s clip in testing, too slow for a
  // CPU-limited container. This trades a little crop smoothness for speed.
  const fps = 24;
  const frames = Math.max(1, Math.round(durationSeconds * fps));
  const zoomExpr = `min(zoom+0.0009,1.15)`;

  const filter =
    `scale=1620:2880,` +
    `zoompan=z='${zoomExpr}':d=${frames}:s=1080x1920:fps=${fps},` +
    `format=yuv420p`;

  await execFileAsync(
    "ffmpeg",
    [
      "-y",
      "-loop",
      "1",
      "-i",
      imagePath,
      "-i",
      audioPath,
      "-vf",
      filter,
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
      String(durationSeconds),
      outPath,
    ],
    { timeout: 180_000 }
  );

  return outPath;
}
