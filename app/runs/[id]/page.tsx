import { db, Run } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type RunDetail = Run & { persona_name: string };

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = db
    .prepare(
      `SELECT runs.*, personas.name AS persona_name
       FROM runs JOIN personas ON personas.id = runs.persona_id
       WHERE runs.id = ?`
    )
    .get(id) as RunDetail | undefined;

  if (!run) notFound();

  const script = run.script_output ? JSON.parse(run.script_output) : null;
  const finalOutput = run.final_output ? JSON.parse(run.final_output) : null;

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

      {finalOutput ? (
        <section className="card">
          <h2 className="mb-3 text-sm font-medium text-neutral-300">Finished reel</h2>
          <video
            src={finalOutput.video_url}
            controls
            className="max-h-[520px] rounded-lg border border-neutral-800"
          />
          <p className="mt-3 text-sm text-neutral-300">{finalOutput.caption}</p>
          <p className="mt-1 text-sm text-neutral-500">
            {finalOutput.hashtags.map((h: string) => `#${h.replace(/^#/, "")}`).join(" ")}
          </p>
        </section>
      ) : (
        <p className="text-sm text-neutral-500">
          This run isn&apos;t finished yet — go to the{" "}
          <Link href="/" className="underline underline-offset-2">
            pipeline page
          </Link>{" "}
          to keep running steps.
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        <StageStatus label="Script" status={run.script_status} />
        <StageStatus label="Image prompt" status={run.image_prompt_status} />
        <StageStatus label="Image" status={run.image_status} />
        <StageStatus label="Voice" status={run.voice_status} />
        <StageStatus label="Video" status={run.video_status} />
        <StageStatus label="Finalize" status={run.finalize_status} />
      </section>

      {script && (
        <section className="card space-y-2 text-sm">
          <h2 className="text-sm font-medium text-neutral-300">Script</h2>
          <p>
            <span className="text-neutral-500">Hook: </span>
            {script.hook}
          </p>
          {script.body?.map((b: string, i: number) => (
            <p key={i}>{b}</p>
          ))}
          <p>
            <span className="text-neutral-500">Close: </span>
            {script.close}
          </p>
          <p>
            <span className="text-neutral-500">CTA: </span>
            {script.cta}
          </p>
        </section>
      )}
    </main>
  );
}

function StageStatus({ label, status }: { label: string; status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-neutral-800 text-neutral-400",
    running: "bg-amber-900/50 text-amber-300",
    done: "bg-emerald-900/50 text-emerald-300",
    error: "bg-red-900/50 text-red-300",
  };
  return (
    <div className="card flex items-center justify-between">
      <span className="text-sm text-neutral-300">{label}</span>
      <span className={`badge ${styles[status] || styles.pending}`}>{status}</span>
    </div>
  );
}
