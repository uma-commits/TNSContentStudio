import { NextRequest, NextResponse } from "next/server";
import { db, SpyAccount } from "@/lib/db";
import { newId } from "@/lib/ids";
import { normalizeAccountUrl } from "@/lib/providers/spy";

export async function GET() {
  const accounts = db.prepare(`SELECT * FROM spy_accounts ORDER BY created_at DESC`).all();
  return NextResponse.json({ accounts });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { platform, handle_or_url } = body;

  if (platform !== "youtube" && platform !== "tiktok") {
    return NextResponse.json({ error: "platform must be 'youtube' or 'tiktok'" }, { status: 400 });
  }
  if (typeof handle_or_url !== "string" || !handle_or_url.trim()) {
    return NextResponse.json({ error: "handle_or_url is required" }, { status: 400 });
  }

  const { handle, url } = normalizeAccountUrl(platform, handle_or_url);
  const id = newId();
  db.prepare(`INSERT INTO spy_accounts (id, platform, handle, url) VALUES (?, ?, ?, ?)`).run(
    id,
    platform,
    handle,
    url
  );

  const account = db.prepare(`SELECT * FROM spy_accounts WHERE id = ?`).get(id) as SpyAccount;
  return NextResponse.json({ account }, { status: 201 });
}
