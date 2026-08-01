"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BASE_PATH } from "@/lib/basePath";

export default function SpyAccountForm() {
  const router = useRouter();
  const [platform, setPlatform] = useState<"youtube" | "tiktok">("youtube");
  const [handle, setHandle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!handle.trim()) {
      setError("Enter a handle or profile URL.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${BASE_PATH}/api/spy/accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, handle_or_url: handle.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add account");
      setHandle("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="card flex flex-wrap items-end gap-3">
      <div>
        <label className="label">Platform</label>
        <select className="input" value={platform} onChange={(e) => setPlatform(e.target.value as "youtube" | "tiktok")}>
          <option value="youtube">YouTube</option>
          <option value="tiktok">TikTok</option>
        </select>
      </div>
      <div className="min-w-[16rem] flex-1">
        <label className="label">Handle or profile URL</label>
        <input
          className="input"
          placeholder="@handle or full profile URL"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
        />
      </div>
      <button type="submit" className="btn" disabled={saving}>
        {saving ? "Adding…" : "Watch account"}
      </button>
      {error && <p className="w-full text-sm text-red-400">{error}</p>}
    </form>
  );
}
