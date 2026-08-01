import { db, SpyAccount } from "@/lib/db";
import Link from "next/link";
import SpyAccountForm from "@/components/SpyAccountForm";
import SpyAccountList from "@/components/SpyAccountList";
import SpyScanButton from "@/components/SpyScanButton";

export const dynamic = "force-dynamic";

type PostRow = {
  id: string;
  post_url: string;
  title: string;
  view_count: number | null;
  first_seen_at: string;
  handle: string;
  platform: string;
};

export default function SpyPage() {
  const accounts = db.prepare(`SELECT * FROM spy_accounts ORDER BY created_at DESC`).all() as SpyAccount[];
  const posts = db
    .prepare(
      `SELECT spy_posts.*, spy_accounts.handle AS handle, spy_accounts.platform AS platform
       FROM spy_posts JOIN spy_accounts ON spy_accounts.id = spy_posts.account_id
       ORDER BY (view_count IS NULL), view_count DESC, first_seen_at DESC
       LIMIT 100`
    )
    .all() as PostRow[];

  return (
    <main className="space-y-8">
      <header>
        <Link href="/" className="text-sm text-neutral-500 underline underline-offset-2">
          ← Back to pipeline
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Account spy</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Watch competitor/inspiration accounts on YouTube or TikTok, scan for their recent posts,
          and pick the top performers to remix. TikTok listing is best-effort (no login) — some
          accounts may return nothing if TikTok rate-limits the scraper.
        </p>
      </header>

      <SpyAccountForm />

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">
          Watched accounts
        </h2>
        <SpyAccountList accounts={accounts} />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
            Discovered posts, by views
          </h2>
          <SpyScanButton />
        </div>
        {posts.length === 0 ? (
          <p className="text-sm text-neutral-500">No posts discovered yet — add an account and scan.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-neutral-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-900/60 text-neutral-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Account</th>
                  <th className="px-4 py-2 font-medium">Title</th>
                  <th className="px-4 py-2 font-medium">Views</th>
                  <th className="px-4 py-2 font-medium">First seen</th>
                  <th className="px-4 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {posts.map((p) => (
                  <tr key={p.id} className="border-t border-neutral-800 hover:bg-neutral-900/40">
                    <td className="px-4 py-2 text-neutral-400">
                      {p.platform} @{p.handle}
                    </td>
                    <td className="px-4 py-2">
                      <a href={p.post_url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                        {p.title || p.post_url}
                      </a>
                    </td>
                    <td className="px-4 py-2">{p.view_count?.toLocaleString() ?? "—"}</td>
                    <td className="px-4 py-2 text-neutral-500">{p.first_seen_at}</td>
                    <td className="px-4 py-2">
                      <Link
                        href={`/?source_url=${encodeURIComponent(p.post_url)}`}
                        className="btn-ghost text-xs"
                      >
                        Remix →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
