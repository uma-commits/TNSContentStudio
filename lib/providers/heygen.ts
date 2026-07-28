import fs from "fs/promises";
import path from "path";
import { mediaDir } from "./paths";

// HeyGen avatar video generation — a paid alternative to the free pan/zoom
// pipeline. One call produces a real lip-synced talking-head video from an
// avatar_id + voiceover text, so it replaces the image/voice/video stages
// entirely for personas configured to use it.
export async function generateAvatarVideo(
  text: string,
  avatarId: string,
  voiceId: string,
  runId: string
): Promise<string> {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey) throw new Error("HEYGEN_API_KEY is not set");
  if (!avatarId) throw new Error("This persona has no HeyGen avatar ID configured");
  if (!voiceId) throw new Error("This persona has no HeyGen voice ID configured");

  const character = await resolveCharacter(avatarId, apiKey);

  const createRes = await fetch("https://api.heygen.com/v2/video/generate", {
    method: "POST",
    signal: AbortSignal.timeout(30_000),
    headers: { "X-Api-Key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      video_inputs: [
        {
          character,
          voice: { type: "text", input_text: text, voice_id: voiceId },
        },
      ],
      dimension: { width: 1080, height: 1920 },
    }),
  });

  if (!createRes.ok) {
    throw new Error(`HeyGen video creation failed: ${createRes.status} ${await createRes.text()}`);
  }
  const created = await createRes.json();
  const videoId: string | undefined = created?.data?.video_id;
  if (!videoId) throw new Error(`HeyGen response had no video_id: ${JSON.stringify(created)}`);

  const videoUrl = await pollUntilReady(videoId, apiKey);

  const videoRes = await fetch(videoUrl, { signal: AbortSignal.timeout(120_000) });
  if (!videoRes.ok) throw new Error(`Failed to download HeyGen video: ${videoRes.status}`);
  const buffer = Buffer.from(await videoRes.arrayBuffer());

  const dir = mediaDir(runId);
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, "reel.mp4");
  await fs.writeFile(filePath, buffer);
  return filePath;
}

// HeyGen has two distinct avatar kinds that use different request shapes:
// stock/interactive avatars (`type: "avatar"`, keyed by avatar_id) and
// custom photo-based "instant avatar" looks (`type: "talking_photo"`, keyed
// by talking_photo_id). The persona form only stores one ID, so this checks
// which kind it is rather than requiring the user to know the distinction.
async function resolveCharacter(
  avatarId: string,
  apiKey: string
): Promise<Record<string, string>> {
  const res = await fetch("https://api.heygen.com/v2/avatars", {
    headers: { "X-Api-Key": apiKey },
    signal: AbortSignal.timeout(15_000),
  });
  if (res.ok) {
    const data = await res.json();
    const avatars: { avatar_id: string }[] = data?.data?.avatars || [];
    if (avatars.some((a) => a.avatar_id === avatarId)) {
      return { type: "avatar", avatar_id: avatarId, avatar_style: "normal" };
    }
  }
  return { type: "talking_photo", talking_photo_id: avatarId };
}

async function pollUntilReady(videoId: string, apiKey: string): Promise<string> {
  const deadline = Date.now() + 8 * 60_000; // HeyGen renders typically take 1-5 min
  while (Date.now() < deadline) {
    const res = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${videoId}`, {
      headers: { "X-Api-Key": apiKey },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`HeyGen status check failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    const status: string | undefined = data?.data?.status;

    if (status === "completed") {
      const url: string | undefined = data?.data?.video_url;
      if (!url) throw new Error("HeyGen reported completed but returned no video_url");
      return url;
    }
    if (status === "failed") {
      throw new Error(`HeyGen render failed: ${data?.data?.error?.message || "unknown error"}`);
    }

    await new Promise((r) => setTimeout(r, 8_000));
  }
  throw new Error("Timed out waiting for HeyGen video to render");
}
