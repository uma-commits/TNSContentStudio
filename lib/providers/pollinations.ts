import fs from "fs/promises";
import path from "path";
import { mediaDir } from "./paths";

// Pollinations.ai — free, no API key, text-to-image via a plain GET URL.
// `filename` lets a run generate more than one distinct image (e.g. the
// hook+demo template's second "demo" scene) without overwriting the first.
export async function generateImage(prompt: string, runId: string, filename = "character.jpg"): Promise<string> {
  const seed = Math.abs(hashCode(runId + prompt));
  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?width=1080&height=1920&seed=${seed}&nologo=true`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Pollinations image request failed: ${res.status}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  const dir = mediaDir(runId);
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, buffer);
  return filePath;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
