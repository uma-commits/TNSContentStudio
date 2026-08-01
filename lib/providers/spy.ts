import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export type SpyEntry = { url: string; title: string; view_count: number | null };

// Lists the N most recent public uploads for a channel/profile URL, without
// downloading anything, via yt-dlp's flat-playlist mode. Works reliably for
// YouTube channels. TikTok profile pages work when yt-dlp isn't rate-limited
// by TikTok, but public listing is best-effort there — no login, so it can
// fail or return partial data; callers should treat empty results as
// "nothing new" rather than an error.
export async function listRecentPosts(accountUrl: string, limit = 15): Promise<SpyEntry[]> {
  const { stdout } = await execFileAsync(
    "yt-dlp",
    ["--flat-playlist", "--dump-json", "--no-warnings", "--playlist-end", String(limit), accountUrl],
    { timeout: 60_000, maxBuffer: 10 * 1024 * 1024 }
  );

  return stdout
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const info = JSON.parse(line);
      const url: string = info.url || info.webpage_url || "";
      return {
        url,
        title: info.title || "",
        view_count: typeof info.view_count === "number" ? info.view_count : null,
      };
    })
    .filter((entry) => entry.url);
}

export function normalizeAccountUrl(platform: string, handleOrUrl: string): { handle: string; url: string } {
  const trimmed = handleOrUrl.trim();
  if (trimmed.startsWith("http")) {
    const handle = trimmed.replace(/\/$/, "").split("/").pop() || trimmed;
    return { handle, url: trimmed };
  }
  const handle = trimmed.replace(/^@/, "");
  if (platform === "tiktok") return { handle, url: `https://www.tiktok.com/@${handle}` };
  return { handle, url: `https://www.youtube.com/@${handle}` };
}
