# Provider Decision — Forge3D

Status: **final** · Researched 2026-09-28/29 · Verified against live APIs 2026-09-30.

## Decision

**Tripo v3 API** (`https://openapi.tripo3d.ai/v3`, model `v3.1-20260211`) is the wired
provider, behind the `src/lib/3d-generation` abstraction. The app ships Tripo-ready;
live generation requires the operator to hold API credits (see
[Free-tier reality check](#free-tier-reality-check)).

## Research matrix (verified against live docs, Sep 2026)

| Provider | Text→3D? | GLB output | Free path (no card) | Server-side API | Vercel fit | Deal-breakers |
|---|---|---|---|---|---|---|
| **Tripo v3 API** | ✅ real model (v3.1 H-series) | ✅ `model_glb` | ⚠️ **was reported** as 2,000 free credits on first key — **did not grant** (see below) | ✅ async REST, Bearer key | ✅ short poll requests | ⚠️ output URLs reportedly expire in ~5 min → must fetch server-side immediately |
| fal.ai + Hunyuan 3D / Meshy | ✅ | ✅ | ⚠️ conflicting reports ($20 signup credit vs. card required vs. no free tier) | ✅ queue API | ✅ | unverified free path; would need an account to test |
| Meshy direct API | ✅ | ✅ | ❌ API disabled on Free plan (Pro only) | ✅ | ✅ | no free API |
| fal + Hunyuan Rapid | ✅ | ❌ OBJ only | ⚠️ | ✅ | ✅ | format mismatch, card question |
| Rodin/Hyper3D | ✅ | paid-download | ❌ "generate free, pay on download" = no free file | ✅ | ✅ | can't obtain GLB free |
| OpenRouter | ❌ | ❌ | n/a | ✅ | ✅ | **no 3D models at all** — catalog output modalities are text/image/audio/embeddings only (verified against live Models API docs) |
| Self-hosted open weights (Hunyuan3D-2, TripoSR, Shap-E) | partial | ✅ | ✅ free (compute) | needs GPU server | ❌ | can't deploy durably on free tier; violates "works after deployment" |
| LLM → procedural code (OpenSCAD/mesh) via free `:free` LLMs | geometry only | ✅ | ✅ | ✅ | ✅ | untextured primitive CAD output — not an AI-generated model; would rewrite the product |

## Why Tripo won the architecture decision

1. **Real async REST API designed for servers** — create task → poll → download;
   no long-lived requests, fits Vercel serverless cleanly.
2. **GLB output natively**, textured + PBR, with `face_limit` control (set to 60,000
   for web-sized assets).
3. **Honest error model** — machine-readable error codes (rate limit, credits,
   content policy) that map cleanly to friendly UI states.
4. **Provider abstraction fits** — swapping in fal/Meshy later is a new file under
   `src/lib/3d-generation/providers/`, zero UI changes.
5. **No durable infrastructure needed** — no queue, no DB; the Tripo task ID is the state.

## Free-tier reality check

**Reported claim** (multiple aggregator sites, May 2026): "2,000 free API credits
($20) granted on first API-key creation, no credit card."

**Measured outcome (2026-09-30), on a freshly created account with exactly one key:**

```
GET /v3/account/balance  →  {"code":0,"data":{"balance":0.00,"frozen":0.00}}
GET /v3/account/usage    →  {"code":0,"data":[]}
POST /v3/generation/text-to-model → HTTP 403
  {"code":2010,"message":"You don't have enough credit to create this task"}
```

The signup bonus **did not grant**. Corroborating evidence that it was never automatic:

- Official pricing page: pay-as-you-go only, `1 credit = $0.01`, text→3D standard
  texture = **20 credits ($0.20)/generation**. No mention of a signup grant.
- Platform billing docs: free credits only via "hackathons, workshops, or community
  giveaways" (Discord/social), not on signup.
- Tripo Game Hub Developer program does grant 5,000 credits, but requires a Google
  Form, ~2 business days manual approval, and is **restricted to game development on
  Tripo Game Hub** — inappropriate for this assignment.

**Consequence for this project:** the app is complete and deploys with the key set,
but end-to-end generation requires the operator to hold credits. Until then the UI
exercises the real **error path** (friendly `insufficient_credits` message → 402 →
"Try Again"), which is implemented and tested.

## Live-verified API contract (Sep 2026)

- Base URL `https://openapi.tripo3d.ai/v3`, auth `Authorization: Bearer <key>`
  (HTTP 401 without it). Error envelope: `{code, status, message, suggestion, request_id}`.
- `POST /generation/text-to-model` accepts model IDs:
  `P1-20260311, P2-20260801, v2.5-20250123, v3.0-20250812, v3.1-20260211`.
  ⚠️ The quick-start doc's example `"model": "tripo-v3.1"` is **stale** — it is
  rejected with code 1004. We use `v3.1-20260211`.
- `GET /account/balance` and `GET /account/usage` exist; other guessed account
  paths 404 with code 4001.
- Out-of-credits = **HTTP 403 + code 2010** (mapped to `insufficient_credits`/402
  in our provider; regression-tested).

### Not measurable while balance = 0

GLB file size, generation wall-time, `model_url` expiry behavior, and CORS headers
on output URLs could not be measured. **The architecture is immune to all of them
anyway:** the status route fetches the model server-side at the moment of success
and streams it to the client (`Content-Type: model/gltf-binary`), so:

- expiry (~5 min, per docs) is consumed server-side inside the window,
- CORS never applies (server → CDN, no browser),
- Vercel's 4.5 MB response cap is bypassed because streaming functions are exempt.

These design choices stand regardless of what the eventual measurements show; if
future measurements show URLs don't expire, streaming still simplifies the client.

## How to make generation live

1. Top up credits in the Tripo console (100 credits = $1; one textured generation
   = 20 credits), or
2. Watch for a community giveaway (Discord/social) per their billing docs.

Then run one generation and record: wall-time, GLB size, `rendered_image_url`
presence, expiry/CORS behavior — append measurements here.
