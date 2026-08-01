"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BASE_PATH } from "@/lib/basePath";
import { EDGE_VOICES } from "@/lib/edgeVoices";

type StyleRow = { name: string; prompt: string };
type BucketRow = { name: string; description: string };

export default function PersonaForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [backstory, setBackstory] = useState("");
  const [voiceDna, setVoiceDna] = useState("");
  const [slang, setSlang] = useState("");
  const [physicalDescription, setPhysicalDescription] = useState("");
  const [edgeVoice, setEdgeVoice] = useState<string>(EDGE_VOICES[0]);
  const [styles, setStyles] = useState<StyleRow[]>([{ name: "", prompt: "" }]);
  const [buckets, setBuckets] = useState<BucketRow[]>([{ name: "", description: "" }]);
  const [videoEngine, setVideoEngine] = useState<"free" | "heygen">("free");
  const [heygenAvatarId, setHeygenAvatarId] = useState("");
  const [heygenVoiceId, setHeygenVoiceId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanStyles = styles.filter((s) => s.name && s.prompt);
    const cleanBuckets = buckets.filter((b) => b.name && b.description);
    if (!name || !backstory || !voiceDna) {
      setError("Name, backstory, and voice DNA are required.");
      return;
    }
    if (cleanBuckets.length === 0) {
      setError("Add at least one content bucket.");
      return;
    }
    if (videoEngine === "free") {
      if (!physicalDescription) {
        setError("Physical description is required for the free engine.");
        return;
      }
      if (cleanStyles.length === 0) {
        setError("Add at least one visual style for the free engine.");
        return;
      }
    } else if (!heygenAvatarId || !heygenVoiceId) {
      setError("HeyGen avatar ID and voice ID are required for the HeyGen engine.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${BASE_PATH}/api/personas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          backstory,
          voice_dna: voiceDna,
          slang,
          physical_description: physicalDescription,
          edge_voice: edgeVoice,
          visual_styles: cleanStyles,
          content_buckets: cleanBuckets,
          video_engine: videoEngine,
          heygen_avatar_id: heygenAvatarId,
          heygen_voice_id: heygenVoiceId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save persona");
      router.refresh();
      setName("");
      setBackstory("");
      setVoiceDna("");
      setSlang("");
      setPhysicalDescription("");
      setStyles([{ name: "", prompt: "" }]);
      setBuckets([{ name: "", description: "" }]);
      setVideoEngine("free");
      setHeygenAvatarId("");
      setHeygenVoiceId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Macca Douglas" />
        </div>
        <div>
          <label className="label">Edge-TTS voice</label>
          <select className="input" value={edgeVoice} onChange={(e) => setEdgeVoice(e.target.value)}>
            {EDGE_VOICES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label">Backstory</label>
        <textarea className="input min-h-20" value={backstory} onChange={(e) => setBackstory(e.target.value)} />
      </div>

      <div>
        <label className="label">Voice DNA (tone, pacing, delivery)</label>
        <textarea className="input min-h-16" value={voiceDna} onChange={(e) => setVoiceDna(e.target.value)} />
      </div>

      <div>
        <label className="label">Slang / expressions (optional)</label>
        <textarea className="input min-h-16" value={slang} onChange={(e) => setSlang(e.target.value)} />
      </div>

      <div>
        <label className="label">Video engine</label>
        <div className="flex gap-2">
          <button
            type="button"
            className={videoEngine === "free" ? "btn" : "btn-ghost"}
            onClick={() => setVideoEngine("free")}
          >
            Free (image + edge-tts + pan/zoom)
          </button>
          <button
            type="button"
            className={videoEngine === "heygen" ? "btn" : "btn-ghost"}
            onClick={() => setVideoEngine("heygen")}
          >
            HeyGen avatar (paid, real lip-sync)
          </button>
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          {videoEngine === "free"
            ? "Uses a generated character image and a pan/zoom video — no talking-head lip-sync."
            : "Skips the image/voice/video steps and generates one lip-synced avatar video via HeyGen. Requires HEYGEN_API_KEY set on the server, plus an avatar and voice ID below."}
        </p>
      </div>

      {videoEngine === "heygen" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">HeyGen avatar ID</label>
            <input
              className="input"
              value={heygenAvatarId}
              onChange={(e) => setHeygenAvatarId(e.target.value)}
              placeholder="From your HeyGen avatar library"
            />
          </div>
          <div>
            <label className="label">HeyGen voice ID</label>
            <input
              className="input"
              value={heygenVoiceId}
              onChange={(e) => setHeygenVoiceId(e.target.value)}
              placeholder="From your HeyGen voice library"
            />
          </div>
        </div>
      )}

      <div>
        <label className="label">
          Fixed physical description (drives image consistency){videoEngine === "heygen" ? " — optional for HeyGen" : ""}
        </label>
        <textarea
          className="input min-h-16"
          value={physicalDescription}
          onChange={(e) => setPhysicalDescription(e.target.value)}
          placeholder="Age, build, face, hair, distinguishing features, typical clothing anchors..."
        />
      </div>

      {videoEngine === "free" && (
        <ListEditor
          title="Visual styles"
          rows={styles}
          setRows={setStyles}
          fields={[
            { key: "name", placeholder: "Style name" },
            { key: "prompt", placeholder: "Backdrop, lighting, mood description" },
          ]}
        />
      )}

      <ListEditor
        title="Content buckets"
        rows={buckets}
        setRows={setBuckets}
        fields={[
          { key: "name", placeholder: "Bucket name" },
          { key: "description", placeholder: "What this bucket covers" },
        ]}
      />

      {error && <p className="text-sm text-red-400">{error}</p>}
      <button type="submit" className="btn" disabled={saving}>
        {saving ? "Saving…" : "Save persona"}
      </button>
    </form>
  );
}

function ListEditor<T extends Record<string, string>>({
  title,
  rows,
  setRows,
  fields,
}: {
  title: string;
  rows: T[];
  setRows: (rows: T[]) => void;
  fields: { key: keyof T; placeholder: string }[];
}) {
  return (
    <div>
      <label className="label">{title}</label>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
            {fields.map((f) => (
              <input
                key={String(f.key)}
                className="input"
                placeholder={f.placeholder}
                value={row[f.key]}
                onChange={(e) => {
                  const next = [...rows];
                  next[i] = { ...next[i], [f.key]: e.target.value };
                  setRows(next);
                }}
              />
            ))}
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setRows(rows.filter((_, idx) => idx !== i))}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="btn-ghost mt-2 text-xs"
        onClick={() => setRows([...rows, Object.fromEntries(fields.map((f) => [f.key, ""])) as T])}
      >
        + Add row
      </button>
    </div>
  );
}
