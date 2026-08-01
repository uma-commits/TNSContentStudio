"use client";

import { useState } from "react";
import { BASE_PATH } from "@/lib/basePath";

export type RunState = {
  id: string;
  source_url: string;
  template: string;
  remix_status: string;
  remix_output: string | null;
  script_status: string;
  script_output: string | null;
  review_status: string;
  review_output: string | null;
  image_prompt_status: string;
  image_status: string;
  voice_status: string;
  video_status: string;
  carousel_status: string;
  carousel_paths: string | null;
  finalize_status: string;
  final_output: string | null;
  [key: string]: unknown;
};

type Step = { key: string; label: string; endpoint: string; statusKey: keyof RunState };

const REMIX_STEP: Step = { key: "remix", label: "Remix", endpoint: "remix", statusKey: "remix_status" };
const SCRIPT_STEP: Step = { key: "script", label: "Script", endpoint: "script", statusKey: "script_status" };
const REVIEW_STEP: Step = { key: "review", label: "Review", endpoint: "review", statusKey: "review_status" };
const FINALIZE_STEP: Step = { key: "finalize", label: "Finalize", endpoint: "finalize", statusKey: "finalize_status" };

const VIDEO_STEPS: Step[] = [
  { key: "image-prompt", label: "Image Prompt", endpoint: "image-prompt", statusKey: "image_prompt_status" },
  { key: "image", label: "Image", endpoint: "image", statusKey: "image_status" },
  { key: "voice", label: "Voice", endpoint: "voice", statusKey: "voice_status" },
  { key: "video", label: "Video", endpoint: "video", statusKey: "video_status" },
];

const CAROUSEL_STEPS: Step[] = [
  { key: "image-prompt", label: "Image Prompt", endpoint: "image-prompt", statusKey: "image_prompt_status" },
  { key: "image", label: "Image", endpoint: "image", statusKey: "image_status" },
  { key: "carousel", label: "Carousel Slides", endpoint: "carousel", statusKey: "carousel_status" },
];

const HEYGEN_STEPS: Step[] = [
  { key: "avatar-video", label: "Avatar Video", endpoint: "avatar-video", statusKey: "video_status" },
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

  const middleSteps =
    videoEngine === "heygen" ? HEYGEN_STEPS : run.template === "carousel" ? CAROUSEL_STEPS : VIDEO_STEPS;
  const steps = [
    ...(run.source_url ? [REMIX_STEP] : []),
    SCRIPT_STEP,
    REVIEW_STEP,
    ...middleSteps,
    FINALIZE_STEP,
  ];

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
      {run.review_status === "done" && run.review_output && <ReviewPreview output={run.review_output} />}
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

function ReviewPreview({ output }: { output: string }) {
  const review = JSON.parse(output) as {
    hook_strength: number;
    retention_risk: string;
    compliance_flags: string[];
    suggestions: string[];
    verdict: "ready" | "needs_revision";
  };
  return (
    <div className="mt-6 space-y-2 border-t border-neutral-800 pt-6 text-sm">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-medium text-neutral-300">
        Expert review
        <span
          className={`badge ${
            review.verdict === "ready" ? "bg-emerald-900/50 text-emerald-300" : "bg-amber-900/50 text-amber-300"
          }`}
        >
          {review.verdict === "ready" ? "Ready" : "Needs revision"}
        </span>
      </h3>
      <p>
        <span className="text-neutral-500">Hook strength: </span>
        {review.hook_strength}/10
      </p>
      <p>
        <span className="text-neutral-500">Retention risk: </span>
        {review.retention_risk}
      </p>
      {review.compliance_flags?.length > 0 && (
        <p className="text-amber-300">
          <span className="text-neutral-500">Compliance flags: </span>
          {review.compliance_flags.join("; ")}
        </p>
      )}
      {review.suggestions?.length > 0 && (
        <ul className="list-inside list-disc text-neutral-400">
          {review.suggestions.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FinalOutput({ output }: { output: string }) {
  const parsed = JSON.parse(output) as {
    video_url?: string;
    slide_urls?: string[];
    caption: string;
    hashtags: string[];
  };
  return (
    <div className="mt-6 border-t border-neutral-800 pt-6">
      <h3 className="mb-3 text-sm font-medium text-neutral-300">Finished {parsed.slide_urls ? "carousel" : "reel"}</h3>
      {parsed.video_url && (
        <video src={parsed.video_url} controls className="max-h-[480px] rounded-lg border border-neutral-800" />
      )}
      {parsed.slide_urls && (
        <div className="flex gap-3 overflow-x-auto">
          {parsed.slide_urls.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={url} alt={`Slide ${i + 1}`} className="h-[480px] rounded-lg border border-neutral-800" />
          ))}
        </div>
      )}
      <p className="mt-3 text-sm text-neutral-300">{parsed.caption}</p>
      <p className="mt-1 text-sm text-neutral-500">{parsed.hashtags.map((h) => `#${h.replace(/^#/, "")}`).join(" ")}</p>
    </div>
  );
}
