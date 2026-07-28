import { db, Run, Persona } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import RunSteps from "@/components/RunSteps";

export const dynamic = "force-dynamic";

type RunDetail = Run & { persona_name: string; video_engine: Persona["video_engine"] };

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = db
    .prepare(
      `SELECT runs.*, personas.name AS persona_name, personas.video_engine AS video_engine
       FROM runs JOIN personas ON personas.id = runs.persona_id
       WHERE runs.id = ?`
    )
    .get(id) as RunDetail | undefined;

  if (!run) notFound();

  return (
    <main className="space-y-8">
      <Link href="/" className="text-sm text-neutral-500 underline underline-offset-2">
        ← Back to pipeline
      </Link>

      <header>
        <h1 className="text-2xl font-semibold">{run.topic}</h1>
        <p className="mt-1 text-sm text-neutral-400">
          {run.persona_name} · {run.content_bucket} · started {run.created_at}
        </p>
      </header>

      <RunSteps initialRun={run} videoEngine={run.video_engine} />
    </main>
  );
}
