import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, "runs.db");

declare global {
  // eslint-disable-next-line no-var
  var __contentStudioDb: Database.Database | undefined;
}

export const db = global.__contentStudioDb ?? new Database(DB_PATH);
if (process.env.NODE_ENV !== "production") global.__contentStudioDb = db;

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS personas (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    backstory TEXT NOT NULL,
    voice_dna TEXT NOT NULL,
    slang TEXT NOT NULL DEFAULT '',
    physical_description TEXT NOT NULL,
    visual_styles TEXT NOT NULL,      -- JSON array of {name, prompt}
    content_buckets TEXT NOT NULL,    -- JSON array of {name, description}
    edge_voice TEXT NOT NULL DEFAULT 'en-AU-WilliamNeural',
    video_engine TEXT NOT NULL DEFAULT 'free',   -- 'free' | 'heygen'
    heygen_avatar_id TEXT NOT NULL DEFAULT '',
    heygen_voice_id TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY,
    persona_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    content_bucket TEXT NOT NULL,
    source_url TEXT NOT NULL DEFAULT '',
    template TEXT NOT NULL DEFAULT 'talking_head',   -- 'talking_head' | 'hook_demo' | 'text_on_screen' | 'carousel'

    remix_status TEXT NOT NULL DEFAULT 'pending',
    remix_output TEXT,

    script_status TEXT NOT NULL DEFAULT 'pending',
    script_output TEXT,

    review_status TEXT NOT NULL DEFAULT 'pending',
    review_output TEXT,

    carousel_status TEXT NOT NULL DEFAULT 'pending',
    carousel_paths TEXT,

    image_prompt_status TEXT NOT NULL DEFAULT 'pending',
    image_prompt_output TEXT,

    image_status TEXT NOT NULL DEFAULT 'pending',
    image_path TEXT,

    voice_status TEXT NOT NULL DEFAULT 'pending',
    voice_path TEXT,
    voice_duration_seconds REAL,

    video_status TEXT NOT NULL DEFAULT 'pending',
    video_path TEXT,

    finalize_status TEXT NOT NULL DEFAULT 'pending',
    final_output TEXT,

    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (persona_id) REFERENCES personas(id)
  );

  CREATE TABLE IF NOT EXISTS spy_accounts (
    id TEXT PRIMARY KEY,
    platform TEXT NOT NULL,   -- 'youtube' | 'tiktok'
    handle TEXT NOT NULL,
    url TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS spy_posts (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    post_url TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    view_count INTEGER,
    first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(account_id, post_url),
    FOREIGN KEY (account_id) REFERENCES spy_accounts(id)
  );
`);

// Lightweight migration for columns added after the table already existed in
// a deployed database — SQLite has no "ADD COLUMN IF NOT EXISTS", so check first.
const existingColumns = new Set(
  (db.prepare(`PRAGMA table_info(personas)`).all() as { name: string }[]).map((c) => c.name)
);
const migrations: [string, string][] = [
  ["video_engine", `ALTER TABLE personas ADD COLUMN video_engine TEXT NOT NULL DEFAULT 'free'`],
  ["heygen_avatar_id", `ALTER TABLE personas ADD COLUMN heygen_avatar_id TEXT NOT NULL DEFAULT ''`],
  ["heygen_voice_id", `ALTER TABLE personas ADD COLUMN heygen_voice_id TEXT NOT NULL DEFAULT ''`],
];
for (const [column, sql] of migrations) {
  if (!existingColumns.has(column)) db.exec(sql);
}

const existingRunColumns = new Set(
  (db.prepare(`PRAGMA table_info(runs)`).all() as { name: string }[]).map((c) => c.name)
);
const runMigrations: [string, string][] = [
  ["source_url", `ALTER TABLE runs ADD COLUMN source_url TEXT NOT NULL DEFAULT ''`],
  ["remix_status", `ALTER TABLE runs ADD COLUMN remix_status TEXT NOT NULL DEFAULT 'pending'`],
  ["remix_output", `ALTER TABLE runs ADD COLUMN remix_output TEXT`],
  ["template", `ALTER TABLE runs ADD COLUMN template TEXT NOT NULL DEFAULT 'talking_head'`],
  ["review_status", `ALTER TABLE runs ADD COLUMN review_status TEXT NOT NULL DEFAULT 'pending'`],
  ["review_output", `ALTER TABLE runs ADD COLUMN review_output TEXT`],
  ["carousel_status", `ALTER TABLE runs ADD COLUMN carousel_status TEXT NOT NULL DEFAULT 'pending'`],
  ["carousel_paths", `ALTER TABLE runs ADD COLUMN carousel_paths TEXT`],
];
for (const [column, sql] of runMigrations) {
  if (!existingRunColumns.has(column)) db.exec(sql);
}

export type Persona = {
  id: string;
  name: string;
  backstory: string;
  voice_dna: string;
  slang: string;
  physical_description: string;
  visual_styles: string;
  content_buckets: string;
  edge_voice: string;
  video_engine: string;
  heygen_avatar_id: string;
  heygen_voice_id: string;
  created_at: string;
};

export type Run = {
  id: string;
  persona_id: string;
  topic: string;
  content_bucket: string;
  source_url: string;
  template: string;
  remix_status: string;
  remix_output: string | null;
  script_status: string;
  script_output: string | null;
  review_status: string;
  review_output: string | null;
  carousel_status: string;
  carousel_paths: string | null;
  image_prompt_status: string;
  image_prompt_output: string | null;
  image_status: string;
  image_path: string | null;
  voice_status: string;
  voice_path: string | null;
  voice_duration_seconds: number | null;
  video_status: string;
  video_path: string | null;
  finalize_status: string;
  final_output: string | null;
  created_at: string;
  updated_at: string;
};

export function touchRun(id: string) {
  db.prepare(`UPDATE runs SET updated_at = datetime('now') WHERE id = ?`).run(id);
}

export type SpyAccount = {
  id: string;
  platform: string;
  handle: string;
  url: string;
  created_at: string;
};

export type SpyPost = {
  id: string;
  account_id: string;
  post_url: string;
  title: string;
  view_count: number | null;
  first_seen_at: string;
};
