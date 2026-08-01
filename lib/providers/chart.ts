import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { mediaDir } from "./paths";
import { escapeDrawtext, wrapText } from "./captions";

const execFileAsync = promisify(execFile);

export type StatKind = "percent" | "dollar" | "number";
export type Stat = { value: number; kind: StatKind; raw: string };

// Pulls the first percentage or dollar figure out of a line of script text,
// e.g. "43% ROI" or "$50k minimum" — used to decide which script lines get
// an animated chart scene instead of a plain generated image.
export function extractStat(text: string): Stat | null {
  const pct = text.match(/(\d+(?:\.\d+)?)\s*%/);
  if (pct) return { value: parseFloat(pct[1]), kind: "percent", raw: pct[0] };

  const dollar = text.match(/\$\s?([\d,]+(?:\.\d+)?)\s*([kKmM])?/);
  if (dollar) {
    let value = parseFloat(dollar[1].replace(/,/g, ""));
    if (/m/i.test(dollar[2] || "")) value *= 1_000_000;
    else if (/k/i.test(dollar[2] || "")) value *= 1_000;
    return { value, kind: "dollar", raw: dollar[0] };
  }

  return null;
}

function formatStatValue(stat: Stat): string {
  if (stat.kind === "percent") return `${Math.round(stat.value)}%`;
  if (stat.kind === "dollar") {
    if (stat.value >= 1_000_000) return `$${Math.round(stat.value / 1_000_000)}M`;
    if (stat.value >= 1_000) return `$${Math.round(stat.value / 1_000)}K`;
    return `$${Math.round(stat.value)}`;
  }
  return String(Math.round(stat.value));
}

// Renders a simple animated bar-chart motion graphic via ffmpeg's lavfi
// source (a growing bar + a fading-in stat number + label) — reuses the
// same comma-chained-filter, time-expression, and font= patterns already
// proven working elsewhere in this app (zoompan, drawtext captions), so no
// new rendering engine or dependency is needed for real motion graphics.
export async function generateStatChartClip(
  stat: Stat,
  label: string,
  durationSeconds: number,
  runId: string,
  filename: string
): Promise<string> {
  const dir = mediaDir(runId);
  await fs.mkdir(dir, { recursive: true });
  const outPath = path.join(dir, filename);

  const growSeconds = Math.min(durationSeconds, 1.5).toFixed(2);
  const barMaxWidth = 700;
  const statText = escapeDrawtext(formatStatValue(stat));
  const wrappedLabel = escapeDrawtext(wrapText(label, 32));

  const filter =
    `color=c=0x0f172a:s=1080x1920:d=${durationSeconds},` +
    `drawbox=x=190:y=860:w='min(${barMaxWidth},${barMaxWidth}*t/${growSeconds})':h=120:color=0x22c55e:t=fill,` +
    `drawtext=text='${statText}':fontcolor=white:fontsize=150:font=DejaVu Sans Bold:expansion=none:x=190:y=660:alpha='min(1,t/${growSeconds})',` +
    `drawtext=text='${wrappedLabel}':fontcolor=0xcbd5e1:fontsize=48:font=DejaVu Sans:expansion=none:x=190:y=1040:line_spacing=10:alpha='min(1,t/${growSeconds})'`;

  await execFileAsync(
    "ffmpeg",
    [
      "-y",
      "-f",
      "lavfi",
      "-i",
      filter,
      "-t",
      String(durationSeconds),
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-pix_fmt",
      "yuv420p",
      outPath,
    ],
    { timeout: 60_000 }
  );

  return outPath;
}
