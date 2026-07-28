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
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY,
    persona_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    content_bucket TEXT NOT NULL,

    script_status TEXT NOT NULL DEFAULT 'pending',
    script_output TEXT,

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
`);

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
  created_at: string;
};

export type Run = {
  id: string;
  persona_id: string;
  topic: string;
  content_bucket: string;
  script_status: string;
  script_output: string | null;
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
