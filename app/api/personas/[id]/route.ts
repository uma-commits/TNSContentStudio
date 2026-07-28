import { NextRequest, NextResponse } from "next/server";
import { db, Persona } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const persona = db.prepare(`SELECT * FROM personas WHERE id = ?`).get(id) as Persona | undefined;
  if (!persona) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ persona });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = db.prepare(`SELECT * FROM personas WHERE id = ?`).get(id) as Persona | undefined;
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await req.json();
  const merged = {
    name: body.name ?? existing.name,
    backstory: body.backstory ?? existing.backstory,
    voice_dna: body.voice_dna ?? existing.voice_dna,
    slang: body.slang ?? existing.slang,
    physical_description: body.physical_description ?? existing.physical_description,
    visual_styles: body.visual_styles ? JSON.stringify(body.visual_styles) : existing.visual_styles,
    content_buckets: body.content_buckets ? JSON.stringify(body.content_buckets) : existing.content_buckets,
    edge_voice: body.edge_voice ?? existing.edge_voice,
    id,
  };

  db.prepare(
    `UPDATE personas SET name=@name, backstory=@backstory, voice_dna=@voice_dna, slang=@slang,
     physical_description=@physical_description, visual_styles=@visual_styles,
     content_buckets=@content_buckets, edge_voice=@edge_voice WHERE id=@id`
  ).run(merged);

  const persona = db.prepare(`SELECT * FROM personas WHERE id = ?`).get(id);
  return NextResponse.json({ persona });
}
