# Forge3D

**Text → real 3D model, in one prompt.** Forge3D turns a sentence into a textured, downloadable GLB you can spin around in the browser immediately — built with Next.js 16, React Three Fiber, and the Tripo v3 3D generation API.

## Features

- **Prompt → 3D in one click** — async generation with submit/poll/stream; no long-lived requests, works on mobile
- **Interactive WebGL viewer** — rotate, zoom, pan, reset-to-fit camera, studio lighting, contact shadows
- **Auto-normalization** — every model is bounding-box centered, grounded, and scaled to fit the scene (no tiny/huge surprises)
- **Download** — one click saves `forge3d-<prompt-slug>.glb`
- **Honest status** — indeterminate spinner while generating (the provider reports no real percentage), friendly error messages with retry
- **Responsive** — desktop split view, stacked mobile layout
- **Session-only** — no account, no database; the model lives in your tab

## Architecture

```
Browser (prompt form, state machine, download)
   │  POST /api/generate {prompt}
   ▼
Next.js Route Handler ── validates ──► provider abstraction (src/lib/3d-generation)
   │  { success, taskId, format:"glb" }       │  TextTo3DProvider: createGeneration /
   │  GET /api/generate/[taskId]  (poll 2s)   │  getStatus / streamModel
   │   → { status:"generating" }              ▼
   │   → on success: streams GLB bytes      Tripo v3 REST (server-side only, TRIPO_API_KEY)
   ▼
Client: bytes → object URL → R3F viewer + download (blob)
```

Key decisions (full rationale + measurements in [`docs/provider-decision.md`](docs/provider-decision.md)):

- **Server-side streaming** for GLB delivery — Tripo's output URLs expire in ~5 minutes and may not allow cross-origin reads, so the status route fetches the model the moment it's ready and streams it to the browser. Streaming also bypasses Vercel's 4.5 MB response-body cap.
- **Provider abstraction** — `src/lib/3d-generation/` exposes a small `TextTo3DProvider` interface; the frontend never sees provider wire formats, so a second provider slots in under `providers/` without UI changes.
- **Secrets stay server-side** — `TRIPO_API_KEY` is read only in route handlers; never `NEXT_PUBLIC_*`.

## AI model

- **Provider:** [Tripo](https://platform.tripo3d.ai) (v3 API, model `v3.1`) — chosen for being the only provider offering real text→textured-GLB generation **for free without a credit card**, via a server-side async REST API that deploys cleanly to Vercel.
- **Input:** an English text prompt (≤ 500 characters). **Output:** a single GLB file (mesh + textures, PBR-ready).
- **Flow:** create task → poll status → fetch result. Typical wall time is ~10–120 seconds depending on queue load and settings (`face_limit` tuned to ~60k faces for web-sized assets).
- **Free tier:** as of Sep 2026 there is **no automatic signup bonus** (verified live — new accounts start at 0 balance). Pricing is pay-as-you-go: `1 credit = $0.01`, a textured text→3D generation costs **20 credits ($0.20)**. Occasional free credits are given away via their Discord/social. The operator's key must hold credits for generation to work; without them the app degrades gracefully to a friendly "out of credits" error. Full evidence and measurements in [`docs/provider-decision.md`](docs/provider-decision.md).

## Local setup

```bash
git clone <repo-url> forge3d && cd forge3d
npm install
cp .env.example .env.local   # then paste your TRIPO_API_KEY
npm run dev                  # http://localhost:3000
```

| Script | Purpose |
|---|---|
| `npm run dev` | dev server |
| `npm run build` / `start` | production build / serve |
| `npm run lint` | ESLint |
| `npm test` | vitest suite (validation, filename, provider, API routes) |

## Environment variables

| Name | Required | Where | Purpose |
|---|---|---|---|
| `TRIPO_API_KEY` | yes | server only | Tripo API bearer key ([create one](https://platform.tripo3d.ai)) |
| `AI_PROVIDER` | no | server only | Provider key, defaults to `tripo` |

## Deployment (Vercel)

1. Push the repo to GitHub and import it at [vercel.com/new](https://vercel.com/new) (framework auto-detected: Next.js).
2. Add env var `TRIPO_API_KEY` (Environment → Production & Preview).
3. Deploy. No persistent workers, database, or config beyond the key.

## Limitations

- **Generation takes time** — typically 10–120 s; the loader is indeterminate because the provider doesn't expose real progress.
- **Model quality varies** with prompt specificity — descriptive prompts ("low-poly, metal corners, stylized") beat one-word ones.
- **GLB only** — no OBJ/USDZ export (GLB is the web-native choice; convert downstream if needed).
- **Session-only results** — refreshing the page clears the model; no history or sharing (deliberately no database).
- **Generation needs operator credits** — the Tripo key must hold API credits (20 ≈ $0.20 per textured model; no signup bonus as of Sep 2026). If credits run out, users see a friendly "out of credits" state instead of a broken app.
- **Provider-side queue/rate limits** apply (HTTP 429 handled with a friendly message).
- **Output URL expiry (~5 min)** is handled server-side — models stream through the app, not hot-linked.

## Future improvements

- Persist generations (accounts + storage) and a gallery of past models
- PNG reference-image → 3D and texture-style options
- Second provider behind the existing abstraction for redundancy
- Share links, OBJ/USDZ export, higher-fidelity export tier
