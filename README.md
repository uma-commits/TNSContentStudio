# Content Studio

Topic → script → image → voice → video pipeline for AI-influencer reels, deployed at
`www.truenorthlink.com/labs/aicontentstudio`. Each persona picks a video engine:

- **Free** — OpenRouter free-tier LLMs (Nemotron/Gemma/GPT-OSS) for script + image prompt,
  Pollinations.ai for images, edge-tts for voice, ffmpeg for a pan/zoom video. No paid APIs, no
  real lip-sync.
- **HeyGen** — one paid HeyGen avatar-video call replaces the image/voice/video steps with a
  real lip-synced talking-head video, using a HeyGen avatar ID + voice ID configured on the persona.

## Local setup

```bash
npm install
npm run hash-password -- 'your-new-password'   # copy the printed hash
cp .env.example .env.local                      # then fill in the values
npm run dev
```

Open http://localhost:3000/labs/aicontentstudio, create a persona, then start a run.

`edge-tts` and `ffmpeg` must be installed locally for the voice/video steps to work outside
Docker: `pip install edge-tts` and `apt install ffmpeg` (or the equivalent for your OS).

## Environment variables

- `OPENROUTER_API_KEY` — free-tier key from openrouter.ai. Required.
- `ADMIN_PASSWORD_HASH` — bcrypt hash from `npm run hash-password -- '...'`. If unset, auth is
  disabled (dev convenience only) — **must** be set in production.
- `DATA_DIR` — where the SQLite DB and generated media live. Defaults to `./data`.
- `HEYGEN_API_KEY` — only needed for personas using the HeyGen engine.

## Deploying

The app is a standalone Next.js build behind `basePath: /labs/aicontentstudio`, packaged via the
included `Dockerfile` (Node 20-slim, ffmpeg + edge-tts baked in) and `railway.json`. To deploy:

1. Create a Railway project/service pointed at this repo (or `railway up` from a linked project).
2. Set `OPENROUTER_API_KEY` and `ADMIN_PASSWORD_HASH` as service variables.
3. Attach a persistent volume at `/app/data` so runs/media survive redeploys.
4. Route `www.truenorthlink.com/labs/aicontentstudio` to this service the same way `/ideaforge` is
   routed to its service (reverse proxy / path-based routing at the domain level) — this repo
   only owns the app itself, not the domain-level routing rule.

No Railway project was accessible from this session to complete step 1 automatically — do that
part manually, or share a project ID and it can be finished from here.

## What's intentionally different from the original n8n workflow

- The default (free) engine has no paid APIs and no true lip-sync — the video step is a Ken
  Burns pan/zoom over the generated portrait, synced to the voiceover length.
  Personas that need real lip-sync can opt into the HeyGen engine instead
  (`lib/providers/heygen.ts`), which is paid per HeyGen's pricing.
- No Instagram auto-posting — the pipeline stops at a reviewable finished reel + caption +
  hashtags, same as the article's design choice.
