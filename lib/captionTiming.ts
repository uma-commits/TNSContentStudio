export type CaptionSegment = { text: string; start: number; end: number };

// Splits a sequence of script parts (hook, body lines, close, cta) across a
// known voiceover duration, proportional to each part's word count — used to
// time on-screen captions against the voiceover without needing real
// forced-alignment.
export function computeCaptionSegments(parts: string[], totalDurationSeconds: number): CaptionSegment[] {
  const nonEmpty = parts.filter((p) => p.trim().length > 0);
  const wordCounts = nonEmpty.map((p) => p.trim().split(/\s+/).filter(Boolean).length || 1);
  const totalWords = wordCounts.reduce((a, b) => a + b, 0) || 1;

  let t = 0;
  return nonEmpty.map((text, i) => {
    const duration = (wordCounts[i] / totalWords) * totalDurationSeconds;
    const start = t;
    const end = Math.min(totalDurationSeconds, t + duration);
    t = end;
    return { text, start: round2(start), end: round2(end) };
  });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
