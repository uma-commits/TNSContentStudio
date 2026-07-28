"use client";

import { useMemo, useState } from "react";
import { Persona } from "@/lib/db";

type Bucket = { name: string; description: string };

type RunState = {
  id: string;
  script_status: string;
  image_prompt_status: string;
  image_status: string;
  voice_status: string;
  video_status: string;
  finalize_status: string;
  final_output: string | null;
  [key: string]: unknown;
};

type Step = { key: string; label: string; endpoint: string; statusKey: keyof RunState };

const FREE_STEPS: Step[] = [
  { key: "script", label: "Script", endpoint: "script", statusKey: "script_status" },
  { key: "image-prompt", label: "Image Prompt", endpoint: "image-prompt", statusKey: "image_prompt_status" },
  { key: "image", label: "Image", endpoint: "image", statusKey: "image_status" },
  { key: "voice", label: "Voice", endpoint: "voice", statusKey: "voice_status" },
  { key: "video", label: "Video", endpoint: "video", statusKey: "video_status" },
  { key: "finalize", label: "Finalize", endpoint: "finalize", statusKey: "finalize_status" },
];

const HEYGEN_STEPS: Step[] = [
  { key: "script", label: "Script", endpoint: "script", statusKey: "script_status" },
  { key: "avatar-video", label: "Avatar Video", endpoint: "avatar-video", statusKey: "video_status" },
  { key: "finalize", label: "Finalize", endpoint: "finalize", statusKey: "finalize_status" },
];

export default function PipelineBoard({ personas }: { personas: Persona[] }) {
  const [personaId, setPersonaId] = useState(personas[0]?.id ?? "");
  const [topic, setTopic] = useState("");
  const [bucketName, setBucketName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [run, setRun] = useState<RunState | null>(null);
  const [runPersona, setRunPersona] = useState<Persona | null>(null);
  const [runningStep, setRunningStep] = useState<string | null>(null);

  const persona = personas.find((p) => p.id === personaId);
  const buckets: Bucket[] = useMemo(() => (persona ? JSON.parse(persona.content_buckets) : []), [persona]);
  const activeBucket = bucketName || buckets[0]?.name || "";
  const steps = runPersona?.video_engine === "heygen" ? HEYGEN_STEPS : FREE_STEPS;

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

  async function runStep(endpoint: string) {
    if (!run) return;
    setError(null);
    setRunningStep(endpoint);
    try {
      const res = await fetch(`/contentstudio/api/runs/${run.id}/${endpoint}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Step "${endpoint}" failed`);
      setRun(data.run);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunningStep(null);
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

      {run && (
        <div className="card">
          <p className="mb-4 text-sm text-neutral-400">
            Run started. Step through the pipeline left to right — each step needs the previous one done.
          </p>
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
            {steps.map((step, i) => {
              const status = (run[step.statusKey] as string) || "pending";
              const prevDone = i === 0 || (run[steps[i - 1].statusKey] as string) === "done";
              return (
                <div key={step.key} className="flex flex-col items-center gap-2 text-center">
                  <span className="text-xs font-medium text-neutral-500">
                    {i + 1}. {step.label}
                  </span>
                  <StatusDot status={status} />
                  <button
                    className="btn-ghost w-full justify-center text-xs"
                    disabled={!prevDone || status === "running" || runningStep !== null}
                    onClick={() => runStep(step.endpoint)}
                  >
                    {runningStep === step.endpoint ? "Running…" : status === "done" ? "Re-run" : "Run"}
                  </button>
                </div>
              );
            })}
          </div>
          {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
          {run.finalize_status === "done" && run.final_output && (
            <FinalOutput output={run.final_output} />
          )}
        </div>
      )}
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-neutral-700",
    running: "bg-amber-400 animate-pulse",
    done: "bg-emerald-400",
    error: "bg-red-400",
  };
  return <span className={`h-2 w-2 rounded-full ${colors[status] || colors.pending}`} />;
}

function FinalOutput({ output }: { output: string }) {
  const parsed = JSON.parse(output) as { video_url: string; caption: string; hashtags: string[] };
  return (
    <div className="mt-6 border-t border-neutral-800 pt-6">
      <h3 className="mb-3 text-sm font-medium text-neutral-300">Finished reel</h3>
      <video src={parsed.video_url} controls className="max-h-[480px] rounded-lg border border-neutral-800" />
      <p className="mt-3 text-sm text-neutral-300">{parsed.caption}</p>
      <p className="mt-1 text-sm text-neutral-500">{parsed.hashtags.map((h) => `#${h.replace(/^#/, "")}`).join(" ")}</p>
    </div>
  );
}
