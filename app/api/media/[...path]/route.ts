import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const MEDIA_ROOT = path.join(DATA_DIR, "media");

const CONTENT_TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;

  // Resolve and confirm the path stays inside MEDIA_ROOT — reject traversal.
  const resolved = path.resolve(MEDIA_ROOT, ...segments);
  if (!resolved.startsWith(MEDIA_ROOT + path.sep)) {
    return NextResponse.json({ error: "invalid path" }, { status: 400 });
  }
  if (!fs.existsSync(resolved)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const ext = path.extname(resolved).toLowerCase();
  const contentType = CONTENT_TYPES[ext] || "application/octet-stream";
  const buffer = fs.readFileSync(resolved);

  return new NextResponse(new Uint8Array(buffer), {
    headers: { "Content-Type": contentType, "Cache-Control": "private, max-age=3600" },
  });
}
