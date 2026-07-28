import { NextRequest, NextResponse } from "next/server";
import { db, Persona } from "@/lib/db";
import { newId } from "@/lib/ids";

export async function GET() {
  const personas = db.prepare(`SELECT * FROM personas ORDER BY created_at DESC`).all() as Persona[];
  return NextResponse.json({ personas });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    name,
    backstory,
    voice_dna,
    slang = "",
    physical_description = "",
    visual_styles = [],
    content_buckets,
    edge_voice = "en-AU-WilliamNeural",
    video_engine = "free",
    heygen_avatar_id = "",
    heygen_voice_id = "",
  } = body;

  if (!["free", "heygen"].includes(video_engine)) {
    return NextResponse.json({ error: "video_engine must be 'free' or 'heygen'" }, { status: 400 });
  }
  if (!name || !backstory || !voice_dna) {
    return NextResponse.json({ error: "name, backstory, voice_dna are required" }, { status: 400 });
  }
  if (!Array.isArray(content_buckets) || content_buckets.length === 0) {
    return NextResponse.json({ error: "content_buckets must be a non-empty array" }, { status: 400 });
  }
  if (video_engine === "free") {
    if (!physical_description) {
      return NextResponse.json({ error: "physical_description is required for the free engine" }, { status: 400 });
    }
    if (!Array.isArray(visual_styles) || visual_styles.length === 0) {
      return NextResponse.json({ error: "visual_styles must be a non-empty array for the free engine" }, { status: 400 });
    }
  } else {
    if (!heygen_avatar_id || !heygen_voice_id) {
      return NextResponse.json(
        { error: "heygen_avatar_id and heygen_voice_id are required for the HeyGen engine" },
        { status: 400 }
      );
    }
  }

  const id = newId();
  db.prepare(
    `INSERT INTO personas
       (id, name, backstory, voice_dna, slang, physical_description, visual_styles, content_buckets,
        edge_voice, video_engine, heygen_avatar_id, heygen_voice_id)
     VALUES
       (@id, @name, @backstory, @voice_dna, @slang, @physical_description, @visual_styles, @content_buckets,
        @edge_voice, @video_engine, @heygen_avatar_id, @heygen_voice_id)`
  ).run({
    id,
    name,
    backstory,
    voice_dna,
    slang,
    physical_description,
    visual_styles: JSON.stringify(visual_styles),
    content_buckets: JSON.stringify(content_buckets),
    edge_voice,
    video_engine,
    heygen_avatar_id,
    heygen_voice_id,
  });

  const persona = db.prepare(`SELECT * FROM personas WHERE id = ?`).get(id);
  return NextResponse.json({ persona }, { status: 201 });
}
