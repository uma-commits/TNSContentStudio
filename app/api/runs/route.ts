import { NextRequest, NextResponse } from "next/server";
import { db, Run } from "@/lib/db";
import { newId } from "@/lib/ids";

export async function GET() {
  const runs = db
    .prepare(
      `SELECT runs.*, personas.name AS persona_name
       FROM runs JOIN personas ON personas.id = runs.persona_id
       ORDER BY runs.created_at DESC LIMIT 100`
    )
    .all();
  return NextResponse.json({ runs });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { persona_id, topic, content_bucket } = body;

  if (!persona_id || !topic || !content_bucket) {
    return NextResponse.json({ error: "persona_id, topic, content_bucket are required" }, { status: 400 });
  }
  if (typeof topic !== "string" || topic.trim().length < 5) {
    return NextResponse.json({ error: "Topic too short — give it at least 5 characters to work with." }, { status: 400 });
  }

  const persona = db.prepare(`SELECT id FROM personas WHERE id = ?`).get(persona_id);
  if (!persona) return NextResponse.json({ error: "persona not found" }, { status: 404 });

  const id = newId();
  db.prepare(
    `INSERT INTO runs (id, persona_id, topic, content_bucket) VALUES (?, ?, ?, ?)`
  ).run(id, persona_id, topic.trim(), content_bucket);

  const run = db.prepare(`SELECT * FROM runs WHERE id = ?`).get(id) as Run;
  return NextResponse.json({ run }, { status: 201 });
}
