import { NextResponse } from "next/server";
import { db, SpyAccount } from "@/lib/db";
import { newId } from "@/lib/ids";
import { listRecentPosts } from "@/lib/providers/spy";

// Scans every watched account for new posts since last scan and records
// them. Best-effort per account — one account failing (rate-limited,
// private, taken down) doesn't stop the others.
export async function POST() {
  const accounts = db.prepare(`SELECT * FROM spy_accounts`).all() as SpyAccount[];
  const newPosts: { account: SpyAccount; url: string; title: string; view_count: number | null }[] = [];
  const errors: { handle: string; error: string }[] = [];

  for (const account of accounts) {
    try {
      const entries = await listRecentPosts(account.url);
      const insert = db.prepare(
        `INSERT OR IGNORE INTO spy_posts (id, account_id, post_url, title, view_count) VALUES (?, ?, ?, ?, ?)`
      );
      for (const entry of entries) {
        const existing = db
          .prepare(`SELECT id FROM spy_posts WHERE account_id = ? AND post_url = ?`)
          .get(account.id, entry.url);
        if (existing) continue;
        insert.run(newId(), account.id, entry.url, entry.title, entry.view_count);
        newPosts.push({ account, url: entry.url, title: entry.title, view_count: entry.view_count });
      }
    } catch (err) {
      errors.push({ handle: account.handle, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return NextResponse.json({ new_posts_found: newPosts.length, errors });
}
