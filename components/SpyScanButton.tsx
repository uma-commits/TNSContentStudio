"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BASE_PATH } from "@/lib/basePath";

export default function SpyScanButton() {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function scan() {
    setScanning(true);
    setResult(null);
    try {
      const res = await fetch(`${BASE_PATH}/api/spy/scan`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scan failed");
      const errorNote = data.errors?.length ? ` (${data.errors.length} account(s) failed)` : "";
      setResult(`Found ${data.new_posts_found} new post(s).${errorNote}`);
      router.refresh();
    } catch (err) {
      setResult(err instanceof Error ? err.message : String(err));
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button className="btn" onClick={scan} disabled={scanning}>
        {scanning ? "Scanning…" : "Scan now"}
      </button>
      {result && <p className="text-sm text-neutral-400">{result}</p>}
    </div>
  );
}
