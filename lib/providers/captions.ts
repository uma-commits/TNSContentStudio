import { execFile } from "child_process";
import { promisify } from "util";
import { CaptionSegment } from "../captionTiming";

const execFileAsync = promisify(execFile);

// ffmpeg drawtext needs ':' and ''' escaped inside the filter string. '%'
// is NOT escaped with a backslash — drawtext's text-expansion pass treats
// '%' specially regardless (needing '%%' to mean a literal percent), so
// every drawtext call here instead passes expansion=none, which makes '%'
// fully literal and needs no escaping at all — verified: '\%' still throws
// "Stray %" with expansion on, so escaping alone is not a fix by itself.
export function escapeDrawtext(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "’");
}

export function wrapText(text: string, maxCharsPerLine = 28): string {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = (line + " " + word).trim();
    if (candidate.length > maxCharsPerLine && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.join("\n");
}

// Builds a chained drawtext filter for one or more timed caption segments,
// each visible only during its [start, end) window — used for burning
// captions onto a video track (text-on-screen / hook+demo templates).
export function timedDrawtextFilter(segments: CaptionSegment[], fontsize = 58): string {
  return segments
    .map((seg) => {
      const wrapped = escapeDrawtext(wrapText(seg.text));
      return (
        `drawtext=text='${wrapped}':fontcolor=white:fontsize=${fontsize}:expansion=none:` +
        `box=1:boxcolor=black@0.55:boxborderw=20:line_spacing=10:` +
        `x=(w-text_w)/2:y=h-text_h-160:` +
        `enable='between(t\\,${seg.start}\\,${seg.end})'`
      );
    })
    .join(",");
}

// Burns a single static caption centered on a still image — used for
// carousel slides, which have no timing to sync against.
export async function burnCaptionOnImage(imagePath: string, outPath: string, text: string): Promise<void> {
  const wrapped = escapeDrawtext(wrapText(text));
  const filter =
    `drawtext=text='${wrapped}':fontcolor=white:fontsize=64:expansion=none:` +
    `box=1:boxcolor=black@0.6:boxborderw=28:line_spacing=14:` +
    `x=(w-text_w)/2:y=(h-text_h)/2`;

  await execFileAsync("ffmpeg", ["-y", "-i", imagePath, "-vf", filter, outPath], { timeout: 60_000 });
}
