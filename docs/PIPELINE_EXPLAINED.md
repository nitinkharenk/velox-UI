# How the Velox AI Pipeline Works

A complete walkthrough — from what the user types to what ends up in the database.

---

## Overview

The pipeline turns a plain-text description into a validated, sandbox-safe React component in four major phases:

```
User input
    │
    ▼
① Structuring         — parse prompt into typed fields
    │
    ▼
② Enrichment          — expand fields into a full spec
    │
    ▼
③ Code Generation     — write the React component
    │
    ▼
④ Validation + Fix    — static checks + semantic AI review + auto-repair
    │
    ▼
⑤ Review / Publish    — human approves → ingested to public library
```

Each phase talks to an AI provider (Anthropic, Gemini, Groq, or Ollama) and writes progress back to Supabase as it goes.

## Runtime Module Boundaries

The live implementation is now split into a thin public facade plus focused helpers:

- `lib/pipeline/generate.ts` keeps the public orchestration API used by routes and runners.
- `lib/pipeline/providerDispatch.ts` chooses the active enrich/code-generation provider.
- `lib/pipeline/validationRuntime.ts` owns timeout budgets, semantic validation, and repair attempts.
- `lib/pipeline/validationStatic.ts` owns the mechanical sandbox fixes and static validation rules.
- `lib/pipeline/workflowUtils.ts` normalizes workflow records and stage ordering from Supabase.
- `lib/pipeline/queueCollections.ts` centralizes filtering/pagination math shared by ideas, review, and inventory pages.

---

## What the User Enters

On the `/velox-ai` page the user fills in three things:

| Field | What it is | Where it goes |
|---|---|---|
| **Prompt** | Free-text description of the component | `run-auto` API body `prompt` |
| **Pipeline** | Which AI workflow to use | `run-auto` API body `pipelineId` |
| **Count** | How many variations to generate (1–5) | `run-auto` API body `count` |

Example prompt:
```
Animated pricing toggle with spring physics
```

When the user hits **Generate**, the client sends:

```http
POST /api/pipeline/run-auto
Accept: text/event-stream
Content-Type: application/json

{
  "prompt": "Animated pricing toggle with spring physics",
  "pipelineId": "abc-123",
  "count": 2
}
```

Because the client sends `Accept: text/event-stream`, the server responds with a live SSE stream so the terminal updates in real time.

---

## Phase 0 — Pipeline Resolution

Before any AI call, the server resolves which AI workflow to use.

```
POST /api/pipeline/run-auto
    │
    ▼
resolveWorkflowPipeline(pipelineId)
    │
    ├─ if pipelineId given → SELECT * FROM pipelines WHERE id = ? JOIN pipeline_stages
    └─ else               → SELECT * FROM pipelines WHERE is_default = true
```

A `WorkflowPipeline` object comes back containing:
- Top-level `provider` and `model` (the fallback)
- An ordered array of `pipeline_stages`, each with its own `action_type`, `provider`, and `model`

If no pipeline exists in the database at all, the code falls back to hardcoded **Claude 3.5 Sonnet** via Anthropic.

**Why this matters:** The resolved `workflow` object is passed through to *every* subsequent AI call, so the right provider is always used. Before the bug fix in this session, `structureIdeaFromPrompt` ran before workflow resolution and always called Anthropic regardless of the selected pipeline.

---

## Phase 1 — Structuring

The raw prompt is too loose for the pipeline to work with. This phase converts it into a strict typed object.

**Function:** `structureIdeaFromPrompt(prompt, { variationIndex, totalCount, existingIdeas, workflow })`

**What it sends to the AI:**

```
Please map this component idea into the structured fields.

Idea: "Animated pricing toggle with spring physics"

You are creating variation 1 of 2. Make this concept meaningfully distinct...
Avoid overlapping too closely with these previous concepts: [prior ideas if any]

Default to Framer Motion + Tailwind if not specified.
```

**Provider dispatch:**

| Provider | Method |
|---|---|
| `anthropic` | Tool use (`tool_choice: { type: 'tool', name: 'structure_idea' }`) — guaranteed structured output |
| `groq` | Chat completion with `response_format: { type: 'json_object' }` |
| `gemini` | REST API with `responseMimeType: 'application/json'` |
| `ollama` | Generate with `format: 'json'` |

**What comes back:**

```json
{
  "name": "Spring Pricing Toggle",
  "type": "click",
  "category": "component",
  "tech": ["Framer Motion", "Tailwind"],
  "complexity": "medium",
  "feel": "Smooth spring-physics toggle between monthly and annual pricing. Pill slides with overshoot. Numbers counter-animate on switch."
}
```

This is called once per requested variation (so if `count = 2`, two AI calls happen here sequentially, with the first result passed as context to the second so they stay distinct).

**Database write:** none yet — these fields are stored in memory until `insertIdeas()` below.

---

## Phase 2 — Idea Insertion

After all variations are structured, they are written to the `ideas` table as a batch:

```sql
INSERT INTO ideas (name, type, category, tech, complexity, feel)
VALUES (...), (...)
RETURNING id, name, status
```

Initial `status` = `'pending'`.

The returned `id` values are what the rest of the pipeline tracks. From this point, every AI call and status update is keyed by `ideaId`.

**SSE events emitted to client:**

```json
{ "event": "run_started", "runId": "...", "totalIdeas": 2 }
{ "event": "ideas_created", "runId": "...", "ideaIds": ["id1", "id2"] }
```

---

## Phase 3 — Per-Idea Pipeline (runPipeline)

For each inserted idea, `runPipeline(ideaId, { workflow })` runs. This is a sequential three-stage loop driven by the `pipeline_stages` array from the resolved workflow (sorted by `step_order`).

### Stage 1 — Enrich Spec (`action_type: 'enrich_spec'`)

**DB write:** `status → 'enriching'`

**SSE:** `{ "event": "status", "stage": "enriching", "message": "Executing Stage: Research..." }`

The AI receives the raw idea fields as JSON:

```json
{
  "name": "Spring Pricing Toggle",
  "type": "click",
  "category": "component",
  "tech": ["Framer Motion", "Tailwind"],
  "complexity": "medium",
  "feel": "Smooth spring-physics toggle..."
}
```

The AI expands this into a full `EnrichedSpec`:

```json
{
  "name": "Spring Pricing Toggle",
  "description": "A billing period toggle with spring-physics animation...",
  "seo_description": "Animated React pricing toggle using Framer Motion spring...",
  "animation_spec": {
    "trigger": "click",
    "duration": 0.4,
    "easing": "spring",
    "properties": ["x", "opacity", "scale"]
  },
  "visual_spec": {
    "palette": ["#1a1a2e", "#e94560"],
    "layout": "horizontal pill",
    "typography": "Inter, sans-serif"
  },
  "implementation_notes": "Use useSpring for the pill. Counter-animate numbers with useMotionValue.",
  "tags": ["pricing", "toggle", "spring", "billing"],
  "component_structure": "PricingToggle > TogglePill + PriceDisplay",
  "interactions": ["click to toggle", "spring overshoot on pill"],
  "tech": ["Framer Motion", "Tailwind"]
}
```

**DB write:** `status → 'enriched'`, `enriched_spec → <json above>`

**SSE:** `{ "event": "enriched", "spec": {...} }`

If AI returns an empty string, the pipeline throws and the idea status becomes `'failed'`.

---

### Stage 2 — Code Generation (`action_type: 'generate_code'`)

**DB write:** `status → 'generating'`

**SSE:** `{ "event": "status", "stage": "generating", "message": "Executing Stage: Code Generation..." }`

The full `EnrichedSpec` JSON is sent to the AI as the generation prompt. The AI writes a React component. The returned string is cleaned:

```
cleanCodeOutput(raw)
  → strip markdown fences (```tsx ... ```)
  → trim whitespace
```

**What the code must look like (sandbox rules):**

- `export default function ComponentName()` — required entry point
- No `import` statements — use `window.React`, `window.Motion`, `window.GSAP`
- No `h-screen` / `min-h-screen` / `100vh` — use inline `style={{ minHeight: '360px' }}`
- No arbitrary Tailwind brackets (`h-[400px]`) — use inline styles
- No `window.addEventListener` / `document.querySelector` — use `useRef`
- Inline SVG for icons (no FontAwesome)

**DB write:** `status → 'generated'`

**SSE:** `{ "event": "generated", "code": "export default function..." }`

---

### Stage 3 — Validation + Fix (`action_type: 'validate_code'`)

**DB write:** `status → 'validating'`

**SSE:** `{ "event": "status", "stage": "validating", "message": "Executing Stage: Self Correction..." }`

This stage runs up to **3 attempts** in a loop. Each attempt has two layers:

#### Layer A — Auto-fix (mechanical, always runs first)

Before any check, `autoFixCode(code)` applies deterministic transforms:

| Pattern found | Transform applied |
|---|---|
| `.onChange(cb)` | → `.on('change', cb)` (FM v11 removed this) |
| `React.useState` etc. | → bare `useState` (globals don't need namespace) |
| `import React from 'react'` | → removed |
| `import { motion } from 'framer-motion'` | → removed |
| `className="... min-h-screen ..."` | → `style={{ minHeight: "100vh" }}` added |
| `className="... h-screen ..."` | → `style={{ height: "100vh" }}` added |

#### Layer B — Static validation (regex rules, ~15 checks)

`validateCodeString(code)` runs all checks at once and accumulates errors:

- Missing `export default function`
- Any remaining `import` from `react` or `framer-motion`
- Viewport units (`100vh`, `h-screen`, `min-h-screen`)
- Arbitrary Tailwind brackets
- Template-literal classNames with `${}`
- `window.addEventListener` / `document.addEventListener`
- `document.querySelector` / `getElementById`
- `.get()` called inside a `style` prop (MotionValue misuse)
- Duplicate `style` or `className` props on same element
- Hardcoded fake image paths
- Placeholder icon classes
- `.onChange()` (FM v11 removed)
- React hooks used without `const { useState } = window.React` destructure
- Framer Motion symbols used without `const { motion } = window.Motion` destructure

**If static validation fails and attempts remain:**
AI receives the code + error message → `runFixAttempt()` → `autoFixCode()` applied to result → loop continues.

**If static validation passes:**

#### Layer C — Semantic validation (AI review)

The AI receives:
- The `EnrichedSpec` JSON (what was requested)
- The generated code (what was produced)

It returns a `ValidationReport`:

```json
{
  "status": "PASS",
  "score": 92,
  "issues": [
    { "severity": "minor", "type": "animation", "message": "Spring damping could be higher for smoother feel" }
  ]
}
```

`status` is one of `PASS`, `PASS_WITH_WARNINGS`, or `FAIL`.

**If semantic validation fails and attempts remain:**
The issue list is stringified and passed to `runFixAttempt()` as the error context. Loop continues.

**If all 3 attempts are exhausted:**
Returns with `has_errors: true`. The idea will end up in `repair_required` status.

**DB write:** `status → 'validated'`

**SSE:**
```json
{
  "event": "validated",
  "code": "...",
  "has_errors": false,
  "validation_notes": "...",
  "validation_report": { "status": "PASS", "score": 92, "issues": [...] }
}
```

---

## Phase 4 — Final Status Assignment

After the stage loop completes, `inferPipelineStatus(result)` maps the validation result to a final status:

| Condition | Final status |
|---|---|
| `has_errors = true` | `repair_required` |
| `validation_report.status = 'FAIL'` | `repair_required` |
| `validation_report.status = 'PASS_WITH_WARNINGS'` | `ready_with_warnings` |
| `PASS` or no validation stage ran | `ready` |

**DB write:**
```sql
UPDATE ideas
SET status = 'ready',          -- or ready_with_warnings / repair_required
    generated_code = '...'
WHERE id = ?
```

**Then** `handoffReadyIdea()` in `run-auto/route.ts` promotes `ready` and `ready_with_warnings` ideas one more step:

```sql
UPDATE ideas SET status = 'reviewing' WHERE id = ?
```

**SSE:**
```json
{ "event": "ready", "status": "reviewing", "ideaId": "...", "code": "..." }
{ "event": "idea_completed", "status": "reviewing", "index": 1, "total": 2 }
```

For `repair_required`:
```json
{ "event": "repair_required", "message": "Validation found blocking issues", "issues": [...] }
```

For unhandled exceptions at any point:
```json
{ "event": "error", "message": "AI Provider returned an empty response..." }
```
And the DB writes `status = 'failed'`, `error_log = <message>`.

---

## Phase 5 — Manual Review → Publish

Ideas with `status IN ('reviewing', 'ready_with_warnings', 'validated', 'generated', 'failed')` appear in the Review Queue (`/pipeline/review`).

A human reviewer approves the component. This calls:

```http
POST /api/pipeline/ingest
{ "code": "...", "spec": {...}, "ideaId": "..." }
```

`ingestAsset()` does five things:

1. **Slug generation** — `spec.name` → lowercase, spaces to dashes, non-alphanumeric stripped.
   `"Spring Pricing Toggle"` → `"spring-pricing-toggle"`

2. **Sandbox HTML build** — `buildSandboxHTML(code)` wraps the component in a full HTML document with Babel Standalone, React UMD, Framer Motion UMD, and GSAP UMD loaded from CDN. This is what the preview iframes load.

3. **Vector embedding** (optional) — If `OPENAI_API_KEY` is set, `text-embedding-3-small` generates a 1536-dimensional vector from the name, description, tags, and trigger. Stored for semantic search.

4. **Upsert to `assets` table** — `ON CONFLICT (slug)` — publishing the same name twice silently overwrites:
   ```sql
   INSERT INTO assets (slug, name, code, preview_html, tags, tech, animation_spec,
                       visual_spec, embedding, is_published, ...)
   VALUES (...)
   ON CONFLICT (slug) DO UPDATE SET ...
   ```

5. **Version history** — Every publish appends to `asset_versions`:
   ```sql
   INSERT INTO asset_versions (asset_slug, code) VALUES (?, ?)
   ```

6. **Idea status update:**
   ```sql
   UPDATE ideas SET status = 'approved' WHERE id = ?
   ```

If the reviewer declines: `status → 'rejected'`. The idea stays in the `ideas` table and never reaches `assets`.

---

## Complete Status Machine

```
pending
  └─→ enriching    (DB write at start of enrich stage)
        └─→ enriched     (DB write after enrich AI call succeeds)
              └─→ generating  (DB write at start of generate stage)
                    └─→ generated    (DB write after generate AI call succeeds)
                          └─→ validating  (DB write at start of validate stage)
                                └─→ validated      (DB write after all validation passes)
                                      └─→ ready                 ─┐
                                      └─→ ready_with_warnings  ──┼─→ reviewing  (handoff)
                                      └─→ repair_required        │      └─→ approved  (ingest)
                                                                  │      └─→ rejected
                                └─→ failed  (any unhandled exception)
```

---

## Database Tables Involved

| Table | When written | Key columns |
|---|---|---|
| `ideas` | Phases 1–4 | `id, name, type, category, format, tech, complexity, feel, prompt, enriched_spec, generated_code, status, error_log, created_at, updated_at` |
| `assets` | Phase 5 (publish) | `id, slug, name, code, preview_html, tags, embedding, is_published, animation_spec, visual_spec` |
| `asset_versions` | Phase 5 (publish) | `id, asset_slug, code, created_at` |
| `pipelines` | Phase 0 (read only) | `id, name, model, provider, system_prompt, is_default` |
| `pipeline_stages` | Phase 0 (read only) | `id, pipeline_id, action_type, provider, model, step_order` |

---

## SSE Event Reference

All events carry `runId`. Events tied to a specific idea also carry `ideaId` and `ideaName`.

| Event | When | Key payload |
|---|---|---|
| `run_started` | Immediately after ideas are structured | `totalIdeas`, `pipelineId` |
| `ideas_created` | After DB insert | `ideaIds[]` |
| `idea_started` | Before each idea's pipeline begins | `index`, `total` |
| `status` | At the start of each stage | `stage` (`enriching`/`generating`/`validating`), `message` |
| `enriched` | After enrich stage succeeds | `spec` (full EnrichedSpec) |
| `generated` | After generate stage succeeds | `code` |
| `validated` | After validate stage finishes | `code`, `has_errors`, `validation_report` |
| `ready` | After final status assigned (non-repair) | `status`, `code` |
| `repair_required` | After final status = repair_required | `issues[]` |
| `idea_completed` | After each idea finishes (success or fail) | `status`, `index`, `total` |
| `run_completed` | After all ideas finish | `completed`, `failed` |
| `error` | On unhandled exception | `message` |

---

## Provider Differences

The same three stages can run on different providers per pipeline config. The key behavioral differences:

| Provider | Structured output method | Notes |
|---|---|---|
| `anthropic` | Tool use (`tool_choice: 'tool'`) | Guaranteed structured output. Used for structuring. |
| `gemini` | `responseMimeType: 'application/json'` | REST API, not SDK. Model default: `gemini-2.5-flash`. |
| `groq` | `response_format: { type: 'json_object' }` | Model default: `llama-3.3-70b-versatile`. |
| `ollama` | `format: 'json'` | Local inference. Model default: `qwen2.5-coder:32b`. Requires `OLLAMA_URL` env var. |

For enrichment and generation (which return prose + code rather than JSON), all providers use their standard chat completion API with the system prompt from the pipeline config.

All AI calls have a **20-second timeout** (`AI_CALL_TIMEOUT_MS = 20_000`). If the timeout fires, the attempt is treated as an error and (if attempts remain) a fix/retry is triggered.
