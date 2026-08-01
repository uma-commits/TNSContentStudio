"use client";

import { useState } from "react";
import { BASE_PATH } from "@/lib/basePath";

export type RunState = {
  id: string;
  source_url: string;
  remix_status: string;
  remix_output: string | null;
  script_status: string;
  script_output: string | null;
  image_prompt_status: string;
  image_status: string;
  voice_status: string;
  video_status: string;
  finalize_status: string;
  final_output: string | null;
  [key: string]: unknown;
};

type Step = { key: string; label: string; endpoint: string; statusKey: keyof RunState };

const REMIX_STEP: Step = { key: "remix", label: "Remix", endpoint: "remix", statusKey: "remix_status" };

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

export default function RunSteps({
  initialRun,
  videoEngine,
}: {
  initialRun: RunState;
  videoEngine: string;
}) {
  const [run, setRun] = useState<RunState>(initialRun);
  const [error, setError] = useState<string | null>(null);
  const [runningStep, setRunningStep] = useState<string | null>(null);
  const baseSteps = videoEngine === "heygen" ? HEYGEN_STEPS : FREE_STEPS;
  const steps = run.source_url ? [REMIX_STEP, ...baseSteps] : baseSteps;

  async function runStep(endpoint: string) {
    setError(null);
    setRunningStep(endpoint);
    try {
      const res = await fetch(`${BASE_PATH}/api/runs/${run.id}/${endpoint}`, { method: "POST" });
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
    <div className="card">
      <p className="mb-4 text-sm text-neutral-400">
        Step through the pipeline left to right — each step needs the previous one done.
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
      {run.remix_status === "done" && run.remix_output && <RemixPreview output={run.remix_output} />}
      {run.script_status === "done" && run.script_output && <ScriptPreview output={run.script_output} />}
      {run.finalize_status === "done" && run.final_output && <FinalOutput output={run.final_output} />}
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

function RemixPreview({ output }: { output: string }) {
  const remix = JSON.parse(output) as {
    source_hook: string;
    hook_pattern: string;
    structure: string[];
    remix_angle: string;
  };
  return (
    <div className="mt-6 space-y-2 border-t border-neutral-800 pt-6 text-sm">
      <h3 className="mb-1 text-sm font-medium text-neutral-300">Remix analysis</h3>
      <p>
        <span className="text-neutral-500">Source hook: </span>
        {remix.source_hook}
      </p>
      <p>
        <span className="text-neutral-500">Hook pattern: </span>
        {remix.hook_pattern}
      </p>
      <p>
        <span className="text-neutral-500">Structure: </span>
        {remix.structure?.join(" → ")}
      </p>
      <p>
        <span className="text-neutral-500">Remix angle: </span>
        {remix.remix_angle}
      </p>
    </div>
  );
}

function ScriptPreview({ output }: { output: string }) {
  const script = JSON.parse(output) as {
    hook: string;
    body: string[];
    close: string;
    cta: string;
    caption: string;
    hashtags: string[];
  };
  return (
    <div className="mt-6 space-y-2 border-t border-neutral-800 pt-6 text-sm">
      <h3 className="mb-1 text-sm font-medium text-neutral-300">Script</h3>
      <p>
        <span className="text-neutral-500">Hook: </span>
        {script.hook}
      </p>
      {script.body?.map((b, i) => (
        <p key={i} className="text-neutral-200">
          {b}
        </p>
      ))}
      <p>
        <span className="text-neutral-500">Close: </span>
        {script.close}
      </p>
      <p>
        <span className="text-neutral-500">CTA: </span>
        {script.cta}
      </p>
      <p className="pt-2 text-neutral-400">{script.caption}</p>
      <p className="text-neutral-500">{script.hashtags?.map((h) => `#${h.replace(/^#/, "")}`).join(" ")}</p>
    </div>
  );
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
