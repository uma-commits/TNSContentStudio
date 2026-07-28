import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { mediaDir } from "./paths";

const execFileAsync = promisify(execFile);

// Microsoft edge-tts — free, no API key, unlimited. Requires the `edge-tts`
// CLI to be present in the container (installed via pip in the Dockerfile).
export async function generateVoice(
  text: string,
  voice: string,
  runId: string
): Promise<{ path: string; durationSeconds: number }> {
  const dir = mediaDir(runId);
  await fs.mkdir(dir, { recursive: true });
  const outPath = path.join(dir, "voiceover.mp3");

  await execFileAsync("edge-tts", ["--voice", voice, "--text", text, "--write-media", outPath], {
    timeout: 120_000,
  });

  const durationSeconds = await probeDuration(outPath);
  return { path: outPath, durationSeconds };
}

async function probeDuration(filePath: string): Promise<number> {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    filePath,
  ]);
  const seconds = parseFloat(stdout.trim());
  return Number.isFinite(seconds) ? seconds : 0;
}
