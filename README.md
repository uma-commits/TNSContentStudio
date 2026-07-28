# Content Studio

Topic → script → image → voice → video pipeline for AI-influencer reels, deployed at
`www.truenorthlink.com/contentstudio`. All-free provider stack: OpenRouter free-tier LLMs
(Nemotron/Gemma/GPT-OSS), Pollinations.ai for images, edge-tts for voice, ffmpeg for a
pan/zoom video (no paid lip-sync API).

## Local setup

```bash
npm install
npm run hash-password -- 'your-new-password'   # copy the printed hash
cp .env.example .env.local                      # then fill in the values
npm run dev
```

Open http://localhost:3000/contentstudio, create a persona, then start a run.

`edge-tts` and `ffmpeg` must be installed locally for the voice/video steps to work outside
Docker: `pip install edge-tts` and `apt install ffmpeg` (or the equivalent for your OS).

## Environment variables

- `OPENROUTER_API_KEY` — free-tier key from openrouter.ai. Required.
- `ADMIN_PASSWORD_HASH` — bcrypt hash from `npm run hash-password -- '...'`. If unset, auth is
  disabled (dev convenience only) — **must** be set in production.
- `DATA_DIR` — where the SQLite DB and generated media live. Defaults to `./data`.

## Deploying

The app is a standalone Next.js build behind `basePath: /contentstudio`, packaged via the
included `Dockerfile` (Node 20-slim, ffmpeg + edge-tts baked in) and `railway.json`. To deploy:

1. Create a Railway project/service pointed at this repo (or `railway up` from a linked project).
2. Set `OPENROUTER_API_KEY` and `ADMIN_PASSWORD_HASH` as service variables.
3. Attach a persistent volume at `/app/data` so runs/media survive redeploys.
4. Route `www.truenorthlink.com/contentstudio` to this service the same way `/ideaforge` is
   routed to its service (reverse proxy / path-based routing at the domain level) — this repo
   only owns the app itself, not the domain-level routing rule.

No Railway project was accessible from this session to complete step 1 automatically — do that
part manually, or share a project ID and it can be finished from here.

## What's intentionally different from the original n8n workflow

- No paid APIs (OpenRouter free models only, Pollinations, edge-tts) — see plan notes.
- No true lip-sync: the video step is a Ken Burns pan/zoom over the generated portrait, synced
  to the voiceover length. Swapping in a paid lip-sync model later is a drop-in replacement of
  `lib/providers/video.ts`.
- No Instagram auto-posting — the pipeline stops at a reviewable finished reel + caption +
  hashtags, same as the article's design choice.
