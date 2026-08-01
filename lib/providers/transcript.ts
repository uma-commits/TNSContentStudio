import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// Pulls whatever text yt-dlp can get for a source video URL (YouTube,
// TikTok, Instagram) without downloading the video itself: title,
// description, and auto-generated subtitles when the platform exposes them.
// TikTok/Instagram frequently have no subtitles — title + description is
// the fallback and is usually enough to identify the hook and structure.
export async function fetchSourceText(url: string): Promise<{ title: string; text: string }> {
  const { stdout } = await execFileAsync(
    "yt-dlp",
    [
      "--dump-json",
      "--skip-download",
      "--no-warnings",
      "--write-auto-sub",
      "--sub-lang",
      "en",
      "--convert-subs",
      "srt",
      url,
    ],
    { timeout: 60_000, maxBuffer: 10 * 1024 * 1024 }
  );

  const info = JSON.parse(stdout.trim().split("\n")[0]);
  const title: string = info.title || "";
  const description: string = info.description || "";

  const subtitleUrl = pickSubtitleUrl(info);
  const subtitleText = subtitleUrl ? await downloadAndStripSrt(subtitleUrl) : "";

  const text = [subtitleText, description].filter(Boolean).join("\n\n").trim();
  if (!text && !title) throw new Error("yt-dlp returned no usable title, description, or subtitles for this URL");

  return { title, text: text || "(no transcript or description available — title only)" };
}

function pickSubtitleUrl(info: Record<string, unknown>): string | null {
  const subs = (info.automatic_captions || info.subtitles) as
    | Record<string, { url: string; ext: string }[]>
    | undefined;
  const track = subs?.en;
  if (!track?.length) return null;
  return track.find((t) => t.ext === "srt")?.url || track[0].url;
}

async function downloadAndStripSrt(url: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) return "";
  const raw = await res.text();
  return raw
    .split("\n")
    .filter((line) => !/^\d+$/.test(line.trim()) && !line.includes("-->"))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
