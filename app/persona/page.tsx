import { db, Persona } from "@/lib/db";
import PersonaForm from "@/components/PersonaForm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function PersonaPage() {
  const personas = db.prepare(`SELECT * FROM personas ORDER BY created_at DESC`).all() as Persona[];

  return (
    <main className="space-y-8">
      <header>
        <Link href="/" className="text-sm text-neutral-500 underline underline-offset-2">
          ← Back to pipeline
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Personas</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Define a character once — backstory, voice DNA, slang, a fixed physical description (for
          image consistency), visual styles, content buckets, and an edge-tts voice — then reuse it
          across every reel.
        </p>
      </header>

      <PersonaForm />

      {personas.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">
            Existing personas
          </h2>
          <div className="space-y-3">
            {personas.map((p) => (
              <div key={p.id} className="card">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{p.name}</h3>
                  <span className="flex items-center gap-2 text-xs text-neutral-500">
                    <span className={`badge ${p.video_engine === "heygen" ? "bg-purple-900/50 text-purple-300" : "bg-neutral-800 text-neutral-400"}`}>
                      {p.video_engine === "heygen" ? "HeyGen" : "Free"}
                    </span>
                    {p.video_engine === "heygen" ? p.heygen_avatar_id : p.edge_voice}
                  </span>
                </div>
                <p className="mt-1 text-sm text-neutral-400">{p.backstory}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
