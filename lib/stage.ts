import { NextResponse } from "next/server";
import { db, Run, Persona } from "@/lib/db";

export function loadRunWithPersona(id: string): { run: Run; persona: Persona } | null {
  const run = db.prepare(`SELECT * FROM runs WHERE id = ?`).get(id) as Run | undefined;
  if (!run) return null;
  const persona = db.prepare(`SELECT * FROM personas WHERE id = ?`).get(run.persona_id) as Persona | undefined;
  if (!persona) return null;
  return { run, persona };
}

// Runs one pipeline stage: marks it "running", executes `fn`, persists the
// result columns on success, or records the error message on failure.
// Mirrors ideaforge's per-step "Run" button semantics — the HTTP request
// blocks until the stage finishes and returns its new status.
export async function runStage(
  id: string,
  statusColumn: string,
  fn: () => Promise<Record<string, unknown>>
): Promise<NextResponse> {
  const loaded = loadRunWithPersona(id);
  if (!loaded) return NextResponse.json({ error: "run not found" }, { status: 404 });

  db.prepare(`UPDATE runs SET ${statusColumn} = 'running', updated_at = datetime('now') WHERE id = ?`).run(id);

  try {
    const columns = await fn();
    const setClause = Object.keys(columns)
      .map((k) => `${k} = @${k}`)
      .join(", ");
    db.prepare(
      `UPDATE runs SET ${statusColumn} = 'done', ${setClause}, updated_at = datetime('now') WHERE id = @id`
    ).run({ ...columns, id });

    const run = db.prepare(`SELECT * FROM runs WHERE id = ?`).get(id);
    return NextResponse.json({ run });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    db.prepare(
      `UPDATE runs SET ${statusColumn} = 'error', updated_at = datetime('now') WHERE id = ?`
    ).run(id);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
