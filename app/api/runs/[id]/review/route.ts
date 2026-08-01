import { NextRequest } from "next/server";
import { loadRunWithPersona, runStage } from "@/lib/stage";
import { chatJSON } from "@/lib/providers/openrouter";

// Stands in for Yorby's paid human "expert strategist" review — an
// automated critique pass instead of a human one. Runs before finalize so a
// weak hook or a compliance red flag (this pipeline defaults to personal
// finance content) gets caught before the reel is marked ready to post.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loaded = loadRunWithPersona(id);
  if (!loaded) return new Response(JSON.stringify({ error: "run not found" }), { status: 404 });
  const { run } = loaded;

  if (!run.script_output) {
    return new Response(JSON.stringify({ error: "Run the script step first." }), { status: 400 });
  }

  const script = JSON.parse(run.script_output) as {
    hook: string;
    body: string[];
    close: string;
    cta: string;
    caption: string;
  };

  const system = `You are a strict short-form-video strategist reviewing a script before it goes to production.
Score it honestly — a script that will flop should score low, not be talked up.

Compliance check (this channel covers personal finance): flag anything that promises guaranteed
returns, names a specific stock/crypto ticker or product as a recommendation, or gives individualized
financial advice rather than general education. General education framing is fine; specific advice is not.

Return ONLY a single JSON object, no prose, no markdown fences, with this exact shape:
{
  "hook_strength": 1-10,
  "retention_risk": "string — where viewers are likely to drop off, or 'none obvious'",
  "compliance_flags": ["string", "..."] ,
  "suggestions": ["string", "..."],
  "verdict": "ready" | "needs_revision"
}`;

  const user = `Hook: ${script.hook}\nBody: ${script.body.join(" ")}\nClose: ${script.close}\nCTA: ${script.cta}\nCaption: ${script.caption}`;

  return runStage(id, "review_status", async () => {
    const parsed = await chatJSON("review", system, user);
    return { review_output: JSON.stringify(parsed) };
  });
}
