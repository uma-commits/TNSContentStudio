import { NextRequest, NextResponse } from "next/server";
import { db, Run } from "@/lib/db";
import { newId } from "@/lib/ids";
import { scrapePageText } from "@/lib/providers/scrape";
import { chatJSON } from "@/lib/providers/openrouter";
import { EDGE_VOICES } from "@/lib/edgeVoices";

const TEMPLATES = ["talking_head", "hook_demo", "text_on_screen", "carousel"];

type BriefResult = {
  persona: {
    name: string;
    backstory: string;
    voice_dna: string;
    slang: string;
    physical_description: string;
    visual_styles: { name: string; prompt: string }[];
    edge_voice: string;
  };
  content_bucket: { name: string; description: string };
  template: string;
  topic: string;
  script: {
    hook: string;
    hook_on_screen_text: string;
    body: string[];
    close: string;
    cta: string;
    caption: string;
    hashtags: string[];
    visual_rationale: string;
  };
  compliance_note: string;
};

// One-shot "brief" flow: scrape a product/service URL, then have an LLM
// invent a matching UGC-creator persona AND write the first script for it
// in a single call, grounded in the actual page content. Creates the
// persona + a run with script_status already 'done' so the only thing
// left for a human is to read the script and click "Approve" — no persona
// form, no topic field, no template picker.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { url } = body;
  if (typeof url !== "string" || !url.trim()) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  let page: { title: string; text: string };
  try {
    page = await scrapePageText(url.trim());
  } catch (err) {
    return NextResponse.json(
      { error: `Couldn't read that page: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 }
    );
  }

  const system = `You are a UGC (user-generated-content style) ad creative director. Given a product/service
landing page, invent a believable creator persona to front the ad, choose the best-fitting video
template, and write the first ad script for it — all grounded in the actual page content, not
generic filler.

Templates and when to use them:
- "talking_head": a spoken, talking-to-camera testimonial/pitch. Default for most products.
- "text_on_screen": no talking head — captioned text over a visual, good for punchy list-style or stat-driven pitches.
- "hook_demo": a hook shot followed by a generated "demo" mockup scene — good for software/apps/platforms with a visual product to show.
- "carousel": a swipeable set of slide images, no voiceover — good for step-by-step or listicle-style pitches.

Flag any compliance concern plainly (financial/health/legal claims, guaranteed-outcome language,
anything needing a disclaimer) in compliance_note — empty string if none.

Return ONLY a single JSON object, no prose, no markdown fences, with this exact shape:
{
  "persona": {
    "name": "string",
    "backstory": "string — 1-3 sentences, who this creator is and why they'd credibly talk about this product",
    "voice_dna": "string — tone, pacing, delivery",
    "slang": "string — expressions this persona uses, or empty string",
    "physical_description": "string — age, build, face, hair, typical clothing, for consistent AI image generation",
    "visual_styles": [{"name": "string", "prompt": "string — backdrop, lighting, mood"}],
    "edge_voice": "one of: ${EDGE_VOICES.join(", ")}"
  },
  "content_bucket": {"name": "string", "description": "string"},
  "template": "one of: ${TEMPLATES.join(", ")}",
  "topic": "string — the specific angle for this ad",
  "script": {
    "hook": "string",
    "hook_on_screen_text": "string",
    "body": ["string", "string"],
    "close": "string",
    "cta": "string",
    "caption": "string",
    "hashtags": ["string", "..."],
    "visual_rationale": "string"
  },
  "compliance_note": "string"
}`;

  const user = `Page title: ${page.title}\n\nPage content:\n${page.text}`;

  let brief: BriefResult;
  try {
    brief = (await chatJSON("brief", system, user)) as BriefResult;
  } catch (err) {
    return NextResponse.json(
      { error: `Brief generation failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 }
    );
  }

  const edgeVoice = (EDGE_VOICES as readonly string[]).includes(brief.persona.edge_voice)
    ? brief.persona.edge_voice
    : EDGE_VOICES[0];
  const template = TEMPLATES.includes(brief.template) ? brief.template : "talking_head";

  const personaId = newId();
  db.prepare(
    `INSERT INTO personas
       (id, name, backstory, voice_dna, slang, physical_description, visual_styles, content_buckets, edge_voice, video_engine)
     VALUES
       (@id, @name, @backstory, @voice_dna, @slang, @physical_description, @visual_styles, @content_buckets, @edge_voice, 'free')`
  ).run({
    id: personaId,
    name: brief.persona.name,
    backstory: brief.persona.backstory,
    voice_dna: brief.persona.voice_dna,
    slang: brief.persona.slang || "",
    physical_description: brief.persona.physical_description,
    visual_styles: JSON.stringify(brief.persona.visual_styles),
    content_buckets: JSON.stringify([brief.content_bucket]),
    edge_voice: edgeVoice,
  });

  const voiceoverText = [brief.script.hook, ...brief.script.body, brief.script.close, brief.script.cta].join(" ");
  const runId = newId();
  db.prepare(
    `INSERT INTO runs (id, persona_id, topic, content_bucket, template, script_status, script_output)
     VALUES (@id, @persona_id, @topic, @content_bucket, @template, 'done', @script_output)`
  ).run({
    id: runId,
    persona_id: personaId,
    topic: brief.topic,
    content_bucket: brief.content_bucket.name,
    template,
    script_output: JSON.stringify({ ...brief.script, voiceover_text: voiceoverText }),
  });

  const run = db.prepare(`SELECT * FROM runs WHERE id = ?`).get(runId) as Run;
  return NextResponse.json({ run, compliance_note: brief.compliance_note }, { status: 201 });
}
