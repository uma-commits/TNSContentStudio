"use client";

import { useMemo, useState } from "react";
import { Persona } from "@/lib/db";
import { BASE_PATH } from "@/lib/basePath";
import RunSteps, { RunState } from "./RunSteps";

type Bucket = { name: string; description: string };

const TEMPLATES = [
  { value: "talking_head", label: "Talking Head", description: "A new AI scene (or animated chart, on stats) per line, fast-changing captions, spoken voiceover." },
  { value: "hook_demo", label: "Hook + Demo", description: "Hook shot, then a demo-style scene, fast-changing captions burned in." },
  { value: "text_on_screen", label: "Text on Screen", description: "Same as Talking Head's visuals, no distinct persona voice emphasis — captions still burned in." },
  { value: "carousel", label: "Carousel", description: "A set of swipeable slide images instead of a video. No voiceover." },
] as const;

export default function PipelineBoard({
  personas,
  initialSourceUrl = "",
}: {
  personas: Persona[];
  initialSourceUrl?: string;
}) {
  const [personaId, setPersonaId] = useState(personas[0]?.id ?? "");
  const [topic, setTopic] = useState("");
  const [sourceUrl, setSourceUrl] = useState(initialSourceUrl);
  const [template, setTemplate] = useState<(typeof TEMPLATES)[number]["value"]>("talking_head");
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
      const res = await fetch(`${BASE_PATH}/api/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          persona_id: personaId,
          topic,
          content_bucket: activeBucket,
          source_url: sourceUrl.trim(),
          template: persona?.video_engine === "heygen" ? "talking_head" : template,
        }),
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
        {persona?.video_engine !== "heygen" && (
          <div>
            <label className="label">Template</label>
            <div className="grid gap-2 sm:grid-cols-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  className={`rounded-lg border px-3 py-2 text-left text-xs ${
                    template === t.value
                      ? "border-neutral-100 bg-neutral-100 text-neutral-950"
                      : "border-neutral-800 text-neutral-300 hover:border-neutral-600"
                  }`}
                  onClick={() => setTemplate(t.value)}
                >
                  <div className="font-medium">{t.label}</div>
                  <div className={template === t.value ? "text-neutral-700" : "text-neutral-500"}>
                    {t.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        <div>
          <label className="label">Remix source URL (optional)</label>
          <input
            className="input"
            placeholder="Paste a TikTok/YouTube/Instagram URL to remix its hook and structure"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
          />
          <p className="mt-1 text-xs text-neutral-500">
            When set, the pipeline gets an extra "Remix" step that extracts the source video's hook
            pattern before writing the script — the topic above still sets what it's actually about.
          </p>
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
