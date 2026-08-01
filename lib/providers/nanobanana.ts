import fs from "fs/promises";
import path from "path";
import { mediaDir } from "./paths";
import { generateImage as generatePollinationsImage } from "./pollinations";

// Nano Banana 2 Lite (Google AI Studio) — free under Google's daily quota,
// then ~$0.034/image beyond that; noticeably better quality than the
// Pollinations free tier. Falls back to Pollinations on any failure (no
// key configured, quota/auth error, network error) so the pipeline never
// hard-fails on image generation.
const MODEL_ID = "gemini-3.1-flash-lite-image";

export async function generateImage(prompt: string, runId: string, filename = "character.jpg"): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return generatePollinationsImage(prompt, runId, filename);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(60_000),
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${prompt}\n\nAspect ratio: 9:16 vertical.` }] }],
        }),
      }
    );

    if (!res.ok) throw new Error(`Nano Banana request failed: ${res.status} ${await res.text()}`);

    const data = await res.json();
    const base64: string | undefined = data?.candidates?.[0]?.content?.parts?.find(
      (p: { inline_data?: { data?: string } }) => p.inline_data?.data
    )?.inline_data?.data;
    if (!base64) throw new Error("Nano Banana returned no image data");

    const dir = mediaDir(runId);
    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, filename);
    await fs.writeFile(filePath, Buffer.from(base64, "base64"));
    return filePath;
  } catch (err) {
    console.error(`Nano Banana image generation failed, falling back to Pollinations: ${err}`);
    return generatePollinationsImage(prompt, runId, filename);
  }
}
