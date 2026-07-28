import { NextRequest, NextResponse } from "next/server";
import { db, Run } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = db
    .prepare(
      `SELECT runs.*, personas.name AS persona_name
       FROM runs JOIN personas ON personas.id = runs.persona_id
       WHERE runs.id = ?`
    )
    .get(id) as Run | undefined;
  if (!run) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ run });
}
