"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SpyAccount } from "@/lib/db";
import { BASE_PATH } from "@/lib/basePath";

export default function SpyAccountList({ accounts }: { accounts: SpyAccount[] }) {
  const router = useRouter();
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function remove(id: string) {
    setRemovingId(id);
    try {
      await fetch(`${BASE_PATH}/api/spy/accounts/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setRemovingId(null);
    }
  }

  if (accounts.length === 0) {
    return <p className="text-sm text-neutral-500">Not watching any accounts yet.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {accounts.map((a) => (
        <span key={a.id} className="badge flex items-center gap-2 bg-neutral-800 text-neutral-300">
          <span className="text-neutral-500">{a.platform}</span> @{a.handle}
          <button
            className="text-neutral-500 hover:text-red-400"
            disabled={removingId === a.id}
            onClick={() => remove(a.id)}
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}
