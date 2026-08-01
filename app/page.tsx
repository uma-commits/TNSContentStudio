import { db, Persona } from "@/lib/db";
import PipelineBoard from "@/components/PipelineBoard";
import Link from "next/link";

export const dynamic = "force-dynamic";

type RunRow = {
  id: string;
  persona_name: string;
  topic: string;
  content_bucket: string;
  script_status: string;
  image_status: string;
  voice_status: string;
  video_status: string;
  finalize_status: string;
  created_at: string;
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ source_url?: string }>;
}) {
  const { source_url } = await searchParams;
  const personas = db.prepare(`SELECT * FROM personas ORDER BY created_at DESC`).all() as Persona[];
  const runs = db
    .prepare(
      `SELECT runs.id, personas.name AS persona_name, runs.topic, runs.content_bucket,
              runs.script_status, runs.image_status, runs.voice_status, runs.video_status,
              runs.finalize_status, runs.created_at
       FROM runs JOIN personas ON personas.id = runs.persona_id
       ORDER BY runs.created_at DESC LIMIT 50`
    )
    .all() as RunRow[];

  return (
    <main className="space-y-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Content Studio</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Enter a topic below and run the whole pipeline left to right on this page — script →
            image prompt → image → voice → video → finalize.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/brief" className="btn">
            Generate from URL →
          </Link>
          <Link href="/spy" className="btn-ghost">
            Account spy →
          </Link>
          <Link href="/persona" className="btn-ghost">
            Manage personas →
          </Link>
        </div>
      </header>

      {personas.length === 0 ? (
        <div className="card">
          <p className="text-sm text-neutral-400">
            No personas yet.{" "}
            <Link href="/persona" className="text-neutral-100 underline underline-offset-2">
              Create your first persona
            </Link>{" "}
            before running the pipeline.
          </p>
        </div>
      ) : (
        <PipelineBoard personas={personas} initialSourceUrl={source_url ?? ""} />
      )}

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">Past runs</h2>
        {runs.length === 0 ? (
          <p className="text-sm text-neutral-500">No runs yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-neutral-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-900/60 text-neutral-500">
                <tr>
                  <th className="px-4 py-2 font-medium">#</th>
                  <th className="px-4 py-2 font-medium">Persona</th>
                  <th className="px-4 py-2 font-medium">Topic</th>
                  <th className="px-4 py-2 font-medium">Script</th>
                  <th className="px-4 py-2 font-medium">Image</th>
                  <th className="px-4 py-2 font-medium">Voice</th>
                  <th className="px-4 py-2 font-medium">Video</th>
                  <th className="px-4 py-2 font-medium">Final</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r, i) => (
                  <tr key={r.id} className="border-t border-neutral-800 hover:bg-neutral-900/40">
                    <td className="px-4 py-2 text-neutral-500">{i + 1}</td>
                    <td className="px-4 py-2">{r.persona_name}</td>
                    <td className="px-4 py-2">
                      <Link href={`/runs/${r.id}`} className="underline underline-offset-2">
                        {r.topic}
                      </Link>
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge status={r.script_status} />
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge status={r.image_status} />
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge status={r.voice_status} />
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge status={r.video_status} />
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge status={r.finalize_status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-neutral-800 text-neutral-400",
    running: "bg-amber-900/50 text-amber-300",
    done: "bg-emerald-900/50 text-emerald-300",
    error: "bg-red-900/50 text-red-300",
  };
  return <span className={`badge ${styles[status] || styles.pending}`}>{status}</span>;
}
