"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BASE_PATH } from "@/lib/basePath";

export default function BriefForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!url.trim()) {
      setError("Paste a product/service URL.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BASE_PATH}/api/brief`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate brief");
      router.push(`${BASE_PATH}/runs/${data.run.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      <div>
        <label className="label">Product / service URL</label>
        <input
          className="input"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={loading}
        />
        <p className="mt-1 text-xs text-neutral-500">
          Reads the page, invents a matching creator persona, picks a template, and writes the first
          script — automatically. You'll land on the script to review; click "Approve & generate"
          there and the rest runs on its own.
        </p>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button type="submit" className="btn" disabled={loading}>
        {loading ? "Reading page & writing script…" : "Generate ad from URL →"}
      </button>
    </form>
  );
}
