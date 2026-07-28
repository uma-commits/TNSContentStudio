"use client";

import { useMemo, useState } from "react";
import { Persona } from "@/lib/db";
import RunSteps, { RunState } from "./RunSteps";

type Bucket = { name: string; description: string };

export default function PipelineBoard({ personas }: { personas: Persona[] }) {
  const [personaId, setPersonaId] = useState(personas[0]?.id ?? "");
  const [topic, setTopic] = useState("");
  const [bucketName, setBucketName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [run, setRun] = useState<RunState | null>(null);
  const [runPersona, setRunPersona] = useState<Persona | null>(null);

  const persona = personas.find((p) => p.id === personaId);
  const buckets: Bucket[] = useMemo(() => (persona ? JSON.parse(persona.content_buckets) : []), [persona]);
  const activeBucket = bucketName || buckets[0]?.name || "";

  async function createRun(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (topic.trim().length < 5) {
      setError("Topic too short — give it at least 5 characters to work with.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/contentstudio/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona_id: personaId, topic, content_bucket: activeBucket }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create run");
      setRun(data.run);
      setRunPersona(persona ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={createRun} className="card space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Persona</label>
            <select
              className="input"
              value={personaId}
              onChange={(e) => {
                setPersonaId(e.target.value);
                setBucketName("");
              }}
            >
              {personas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Content bucket</label>
            <select className="input" value={activeBucket} onChange={(e) => setBucketName(e.target.value)}>
              {buckets.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Reel topic</label>
          <input
            className="input"
            placeholder="e.g. Why the best blokes never have to tell you they're tough"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button type="submit" className="btn" disabled={creating || !personaId}>
          {creating ? "Starting…" : "Start new run →"}
        </button>
      </form>

      {run && <RunSteps initialRun={run} videoEngine={runPersona?.video_engine ?? "free"} />}
    </div>
  );
}
