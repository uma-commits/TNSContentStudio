import path from "path";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");

export function mediaDir(runId: string): string {
  return path.join(DATA_DIR, "media", runId);
}
