# veloxui — Asset Production Pipeline
## Master Build Prompt for Cursor / Claude Code / Windsurf

---

## CONTEXT & GOAL

Build a full-stack Next.js 14 application called **veloxui** — an AI-powered pipeline
for producing React UI components, animations, and templates at scale.

The app has two modes:
1. **Automated pipeline** — uses paid AI APIs (Anthropic Claude, OpenAI) to batch-produce
   assets with zero manual intervention, from idea → enriched spec → code → validated →
   stored in database.
2. **Manual pipeline** — uses free AI (Gemini Flash free tier via Google AI Studio,
   Groq free tier, or local Ollama) where you paste output manually at each step.

**Core architectural decision:**
Assets are NOT stored as `.tsx` files. Component code is stored as a **raw string**
in a Postgres database column. The preview system renders this string in a sandboxed
iframe using a dynamic compilation approach. This means:
- No file system needed
- Instant search and retrieval
- Code is portable — the platform serves it to users via API
- Users copy the string, not a file

---

## TECH STACK

```
Framework:      Next.js 14 App Router (TypeScript strict mode)
Styling:        Tailwind CSS v3 + shadcn/ui components
Database:       Supabase (Postgres + pgvector extension)
AI - Paid:      Anthropic Claude API (claude-sonnet-4-6 for gen, claude-haiku-4-5 for enrich)
AI - Free:      Google Gemini 1.5 Flash (free tier) | Groq (free) | Ollama (local)
Embeddings:     OpenAI text-embedding-3-small OR Supabase built-in (free)
Auth:           Clerk (free tier up to 10K MAU)
Payments:       Lemon Squeezy (handles Indian GST + international)
Preview:        Sandboxed iframe with Babel standalone + React CDN (no build step)
Package mgr:    pnpm
Linting:        ESLint + Prettier
```

---

## PROJECT STRUCTURE

```
veloxui/
├── app/
│   ├── (public)/
│   │   ├── page.tsx                    # Landing / search page
│   │   ├── browse/page.tsx             # Full library browser
│   │   ├── asset/[slug]/page.tsx       # Individual asset page
│   │   └── preview/[slug]/page.tsx     # Full-page preview
│   ├── (dashboard)/
│   │   ├── pipeline/
│   │   │   ├── page.tsx                # Pipeline dashboard
│   │   │   ├── ideas/page.tsx          # Manage idea backlog
│   │   │   ├── generate/page.tsx       # Run generation
│   │   │   └── review/page.tsx         # Manual review queue
│   │   └── settings/page.tsx           # API keys + config
│   └── api/
│       ├── pipeline/
│       │   ├── enrich/route.ts         # Stage 2: enrich ideas
│       │   ├── generate/route.ts       # Stage 3: generate code
│       │   ├── validate/route.ts       # Stage 4: validate code
│       │   └── ingest/route.ts         # Stage 6: store to DB
│       ├── assets/
│       │   ├── search/route.ts         # Semantic search endpoint
│       │   ├── [slug]/route.ts         # Get single asset
│       │   └── random/route.ts         # Random assets for homepage
│       └── preview/
│           └── compile/route.ts        # Compile code string for preview
├── components/
│   ├── pipeline/
│   │   ├── IdeaEditor.tsx              # JSON idea backlog editor
│   │   ├── PipelineRunner.tsx          # Step-by-step automated runner
│   │   ├── ManualPipeline.tsx          # Manual paste-in pipeline
│   │   ├── ReviewQueue.tsx             # Preview + approve/reject
│   │   └── StageStatus.tsx             # Progress indicator
│   ├── assets/
│   │   ├── AssetCard.tsx               # Card with preview thumbnail
│   │   ├── AssetPreview.tsx            # Sandboxed iframe renderer
│   │   ├── CodeBlock.tsx               # Copy-able syntax-highlighted code
│   │   ├── SearchBar.tsx               # Semantic search input
│   │   └── AssetGrid.tsx               # Masonry/grid layout
│   └── ui/                             # shadcn/ui components (auto-generated)
├── lib/
│   ├── pipeline/
│   │   ├── enrich.ts                   # Enrichment logic (paid + free)
│   │   ├── generate.ts                 # Code generation logic (paid + free)
│   │   ├── validate.ts                 # Code validation logic
│   │   └── ingest.ts                   # DB ingestion + embedding
│   ├── ai/
│   │   ├── anthropic.ts                # Claude client wrapper
│   │   ├── gemini.ts                   # Gemini free tier wrapper
│   │   ├── groq.ts                     # Groq free tier wrapper
│   │   └── ollama.ts                   # Local Ollama wrapper
│   ├── db/
│   │   ├── supabase.ts                 # Supabase client
│   │   ├── assets.ts                   # Asset CRUD queries
│   │   └── search.ts                   # Vector similarity search
│   └── preview/
│       └── sandbox.ts                  # Code string → preview HTML
├── types/
│   ├── asset.ts                        # Asset type definitions
│   └── pipeline.ts                     # Pipeline stage types
├── scripts/
│   ├── run-pipeline.ts                 # CLI: run full automated pipeline
│   └── seed-ideas.ts                   # CLI: seed example ideas
└── supabase/
    └── migrations/
        └── 001_initial.sql             # DB schema + pgvector setup
```

---

## DATABASE SCHEMA

Create this exactly in `supabase/migrations/001_initial.sql`:

```sql
-- Enable pgvector
create extension if not exists vector;

-- Core assets table
create table assets (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  name         text not null,
  category     text not null check (category in ('animation','component','template')),
  type         text not null,
  code         text not null,          -- raw TSX/JSX string (no file needed)
  preview_html text,                   -- cached compiled HTML for fast preview
  description  text not null,
  seo_description text,
  tags         text[] default '{}',
  tech         text[] default '{}',
  complexity   text check (complexity in ('low','medium','high')),
  animation_spec jsonb,
  visual_spec  jsonb,
  is_pro       boolean default false,
  is_published boolean default false,
  license      text default 'owned',   -- 'owned' = you generated it, no attribution
  pipeline_mode text default 'auto',   -- 'auto' | 'manual'
  embedding    vector(1536),           -- for semantic search
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- Ideas backlog table
create table ideas (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  type         text not null,
  category     text not null,
  tech         text[],
  complexity   text,
  feel         text,
  enriched_spec jsonb,                 -- filled by Stage 2
  status       text default 'pending' check (status in (
    'pending','enriching','enriched','generating','generated',
    'validating','validated','reviewing','approved','rejected','failed'
  )),
  error_log    text,
  created_at   timestamptz default now()
);

-- Pipeline runs log
create table pipeline_runs (
  id           uuid primary key default gen_random_uuid(),
  mode         text not null,          -- 'auto' | 'manual'
  idea_ids     uuid[],
  total        int default 0,
  approved     int default 0,
  rejected     int default 0,
  failed       int default 0,
  started_at   timestamptz default now(),
  completed_at timestamptz
);

-- Semantic search function
create or replace function search_assets (
  query_embedding vector(1536),
  similarity_threshold float default 0.3,
  match_count int default 10
)
returns table (
  id uuid, slug text, name text, category text, type text,
  description text, tags text[], tech text[], complexity text,
  is_pro boolean, similarity float
)
language sql stable
as $$
  select
    a.id, a.slug, a.name, a.category, a.type,
    a.description, a.tags, a.tech, a.complexity, a.is_pro,
    1 - (a.embedding <=> query_embedding) as similarity
  from assets a
  where
    a.is_published = true
    and 1 - (a.embedding <=> query_embedding) > similarity_threshold
  order by a.embedding <=> query_embedding
  limit match_count;
$$;

-- Indexes
create index on assets using ivfflat (embedding vector_cosine_ops);
create index on assets (category);
create index on assets (is_published);
create index on assets (is_pro);
create index on ideas (status);
```

---

## TYPES (`types/asset.ts` and `types/pipeline.ts`)

```typescript
// types/asset.ts
export interface Asset {
  id: string
  slug: string
  name: string
  category: 'animation' | 'component' | 'template'
  type: string
  code: string           // raw TSX string stored in DB
  preview_html?: string  // cached compiled HTML
  description: string
  seo_description?: string
  tags: string[]
  tech: string[]
  complexity: 'low' | 'medium' | 'high'
  animation_spec?: AnimationSpec
  visual_spec?: VisualSpec
  is_pro: boolean
  is_published: boolean
  license: string
  created_at: string
}

export interface AnimationSpec {
  trigger: 'hover' | 'click' | 'scroll' | 'mount' | 'continuous'
  entry: string
  active: string
  exit: string
  easing: string
  duration_ms: number
  spring?: { stiffness: number; damping: number }
}

export interface VisualSpec {
  dark_mode: boolean
  color_approach: string
  typography?: string
  sizing?: string
}

// types/pipeline.ts
export type IdeaStatus =
  | 'pending' | 'enriching' | 'enriched' | 'generating' | 'generated'
  | 'validating' | 'validated' | 'reviewing' | 'approved' | 'rejected' | 'failed'

export interface Idea {
  id: string
  name: string
  type: string
  category: string
  tech: string[]
  complexity: string
  feel: string
  enriched_spec?: EnrichedSpec
  status: IdeaStatus
  error_log?: string
}

export interface EnrichedSpec {
  name: string
  description: string
  seo_description: string
  animation_spec: AnimationSpec
  visual_spec: VisualSpec
  implementation_notes: string
  tags: string[]
  component_structure: string   // describes what React elements to use
  interactions: string[]        // list of interaction behaviours
}

export interface GeneratedCode {
  code: string          // raw TSX string — NO file, just the string
  imports: string[]     // list of npm packages used
  has_errors: boolean
  validation_notes?: string
}
```

---

## AI CLIENTS (`lib/ai/`)

### `lib/ai/anthropic.ts` — Paid, highest quality

```typescript
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function enrichWithClaude(ideaJson: string): Promise<string> {
  const res = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',  // cheap for research
    max_tokens: 800,
    messages: [{ role: 'user', content: buildEnrichPrompt(ideaJson) }]
  })
  return (res.content[0] as any).text
}

export async function generateWithClaude(specJson: string): Promise<string> {
  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',          // quality for code gen
    max_tokens: 2500,
    system: CODE_GEN_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildGenPrompt(specJson) }]
  })
  return (res.content[0] as any).text
}

export async function fixWithClaude(code: string, error: string): Promise<string> {
  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2500,
    messages: [{
      role: 'user',
      content: `Fix this React component. Error:\n${error}\n\nCode:\n${code}\n\nReturn ONLY the fixed code string. No markdown.`
    }]
  })
  return (res.content[0] as any).text
}
```

### `lib/ai/gemini.ts` — Free tier (Gemini 1.5 Flash)

```typescript
// Uses Google AI Studio free tier — 15 requests/min, 1M tokens/day FREE
// Get key at: https://aistudio.google.com/apikey

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

async function callGemini(prompt: string, model = 'gemini-1.5-flash'): Promise<string> {
  const res = await fetch(
    `${GEMINI_BASE}/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 2500, temperature: 0.3 }
      })
    }
  )
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

export const enrichWithGemini = (ideaJson: string) =>
  callGemini(buildEnrichPrompt(ideaJson))

export const generateWithGemini = (specJson: string) =>
  callGemini(`${CODE_GEN_SYSTEM_PROMPT}\n\n${buildGenPrompt(specJson)}`)
```

### `lib/ai/groq.ts` — Free tier (Llama 3.3 70B via Groq)

```typescript
// Groq free tier: 14,400 requests/day, 30 req/min FREE
// Get key at: https://console.groq.com

import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function generateWithGroq(specJson: string): Promise<string> {
  const res = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',  // best free model on Groq
    max_tokens: 2500,
    temperature: 0.2,
    messages: [
      { role: 'system', content: CODE_GEN_SYSTEM_PROMPT },
      { role: 'user', content: buildGenPrompt(specJson) }
    ]
  })
  return res.choices[0].message.content ?? ''
}
```

### `lib/ai/ollama.ts` — Fully local, zero cost, no key needed

```typescript
// Requires Ollama running locally: https://ollama.ai
// Run: ollama pull codellama:13b  (or qwen2.5-coder:14b for better code)

async function callOllama(prompt: string, model = 'qwen2.5-coder:14b'): Promise<string> {
  const res = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, stream: false })
  })
  const data = await res.json()
  return data.response ?? ''
}

export const generateWithOllama = (specJson: string) =>
  callOllama(`${CODE_GEN_SYSTEM_PROMPT}\n\n${buildGenPrompt(specJson)}`)
```

---

## CORE PROMPTS (`lib/pipeline/prompts.ts`)

These are the most critical part. Get these right and everything else works.

```typescript
export const CODE_GEN_SYSTEM_PROMPT = `You are a senior React developer specialising in
premium animated UI components. You produce clean, production-ready code.

ABSOLUTE RULES:
1. Output ONLY the raw component code. No markdown fences. No explanation. No prose.
2. The output is a RAW STRING that will be stored in a database and rendered in a
   sandboxed iframe. It will be compiled by Babel standalone in the browser.
3. Do NOT include import statements for React — it is available as a global.
4. Do NOT include import statements for framer-motion — it is available as window.Motion.
5. DO include all other logic inline. The component is self-contained.
6. Use Tailwind CSS utility classes for ALL styling.
7. Export the component as: export default function ComponentName() { ... }
8. The component name must be PascalCase matching the asset name.
9. Add a JSDoc comment block at the very top:
   /**
    * @name Component Name
    * @description One sentence description
    * @tags tag1, tag2, tag3
    * @tech Tailwind, Framer Motion
    * @complexity medium
    */
10. No external images. No external fonts. No fetch calls. Pure UI only.
11. Must work on dark backgrounds (use dark Tailwind variants or neutral-900 bg).
12. Must be keyboard accessible where interactive.
13. The component should be visually impressive — premium quality, not generic.

AVAILABLE GLOBALS IN PREVIEW SANDBOX:
- React (useState, useEffect, useRef, etc.)
- window.Motion (framer-motion: { motion, AnimatePresence, useAnimation, etc. })
- window.GSAP (gsap library) — use as: const gsap = window.GSAP
- Tailwind CSS (full utility classes via CDN)

EXAMPLE OUTPUT FORMAT (this is what a valid output looks like):
/**
 * @name Magnetic Button
 * @description Button that moves toward the cursor with spring physics
 * @tags magnetic, spring, hover, button, interactive
 * @tech Tailwind, Framer Motion
 * @complexity medium
 */
export default function MagneticButton() {
  const { motion, useMotionValue, useSpring } = window.Motion
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 300, damping: 20 })
  const springY = useSpring(y, { stiffness: 300, damping: 20 })
  
  function handleMouseMove(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    x.set((e.clientX - centerX) * 0.3)
    y.set((e.clientY - centerY) * 0.3)
  }
  
  function handleMouseLeave() {
    x.set(0)
    y.set(0)
  }

  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <motion.button
        style={{ x: springX, y: springY }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="px-8 py-4 bg-white text-black rounded-full font-medium text-sm
                   hover:scale-105 transition-transform cursor-pointer select-none"
      >
        Hover me
      </motion.button>
    </div>
  )
}`

export function buildEnrichPrompt(ideaJson: string): string {
  return `You are a senior frontend animation designer and UX engineer.

Enrich this bare UI component idea into a precise implementation specification.
Return ONLY valid JSON. No prose. No markdown.

INPUT:
${ideaJson}

OUTPUT — return this exact JSON structure:
{
  "name": "exact component name",
  "description": "one precise sentence of what it does and how it feels",
  "seo_description": "8-12 words optimised for developer search queries",
  "animation_spec": {
    "trigger": "hover|click|scroll|mount|continuous",
    "entry": "describe the entry state and how it transitions in",
    "active": "describe the active/hover/interacting state",
    "exit": "describe how it returns to rest",
    "easing": "specific easing e.g. cubic-bezier(0.34,1.56,0.64,1) or spring",
    "duration_ms": 300,
    "spring": { "stiffness": 400, "damping": 28, "mass": 1 }
  },
  "visual_spec": {
    "dark_mode": true,
    "color_approach": "describe the color palette and contrast approach",
    "sizing": "describe width, height, padding approach",
    "border_radius": "describe corner radius approach",
    "shadow": "describe shadow or glow approach"
  },
  "component_structure": "describe the exact React JSX structure to use",
  "interactions": [
    "list each interaction behaviour",
    "e.g. cursor tracking",
    "e.g. spring return on mouse leave"
  ],
  "implementation_notes": "critical React/Tailwind/Framer Motion implementation details",
  "tags": ["tag1","tag2","tag3","tag4","tag5"],
  "tech": ["Tailwind","Framer Motion"]
}`
}

export function buildGenPrompt(specJson: string): string {
  return `Generate a React component matching this exact specification.
Remember: output the RAW CODE STRING ONLY. No markdown. No explanation.

SPECIFICATION:
${specJson}`
}
```

---

## PREVIEW SYSTEM (`lib/preview/sandbox.ts`)

This is the key innovation — render a raw code string without any build step.

```typescript
// Takes a raw code string from the DB and wraps it in a full HTML document
// that compiles it in-browser using Babel standalone + React CDN

export function buildSandboxHTML(componentCode: string): string {
  // Parse JSDoc metadata from the code string
  const nameMatch = componentCode.match(/@name\s+(.+)/)
  const descMatch = componentCode.match(/@description\s+(.+)/)
  const componentName = nameMatch?.[1]?.trim() ?? 'Component'

  // Extract the component function name from export default
  const exportMatch = componentCode.match(/export default function (\w+)/)
  const fnName = exportMatch?.[1] ?? componentName.replace(/\s+/g, '')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${componentName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/framer-motion@11/dist/framer-motion.js"></script>
  <script src="https://unpkg.com/gsap@3/dist/gsap.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0a0a0a; color: #fff; font-family: system-ui, sans-serif;
           min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    #root { width: 100%; }
    #error { color: #f87171; font-family: monospace; font-size: 12px;
             padding: 16px; white-space: pre-wrap; display: none; }
  </style>
</head>
<body>
  <div id="root"></div>
  <div id="error"></div>
  <script>
    // Make libraries available as globals that components can access
    window.Motion = FramerMotion
    window.GSAP = gsap
    // useState, useEffect etc available directly since React is global
    const { useState, useEffect, useRef, useCallback, useMemo,
            useReducer, useContext, createContext } = React
  </script>
  <script type="text/babel" data-presets="react,typescript">
    try {
      ${componentCode.replace(/^export default /, 'const __Component__ = ')}
      
      const root = ReactDOM.createRoot(document.getElementById('root'))
      root.render(React.createElement(__Component__))
    } catch(e) {
      document.getElementById('error').style.display = 'block'
      document.getElementById('error').textContent = e.message + '\\n' + e.stack
    }
  </script>
</body>
</html>`
}
```

**API route that serves compiled preview** (`app/api/preview/compile/route.ts`):

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getAssetBySlug } from '@/lib/db/assets'
import { buildSandboxHTML } from '@/lib/preview/sandbox'

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')
  if (!slug) return NextResponse.json({ error: 'No slug' }, { status: 400 })

  const asset = await getAssetBySlug(slug)
  if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const html = buildSandboxHTML(asset.code)
  
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
      'X-Frame-Options': 'SAMEORIGIN',
      'Content-Security-Policy': "default-src 'self' unpkg.com cdn.tailwindcss.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' unpkg.com cdn.tailwindcss.com;"
    }
  })
}
```

**Preview component** (`components/assets/AssetPreview.tsx`):

```typescript
'use client'
import { useState } from 'react'

interface AssetPreviewProps {
  slug: string
  height?: number
  showCode?: boolean
  code?: string  // pass code directly for pipeline review (before DB insert)
}

export default function AssetPreview({ slug, height = 400, showCode, code }: AssetPreviewProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview')
  
  // For pipeline review: render code directly without DB lookup
  // For published assets: use the API route which reads from DB
  const srcDoc = code ? buildSandboxHTML(code) : undefined
  const src = code ? undefined : `/api/preview/compile?slug=${slug}`
  
  return (
    <div className="rounded-xl overflow-hidden border border-white/10 bg-neutral-950">
      {showCode && (
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 text-sm ${activeTab === 'preview' ? 'text-white bg-white/5' : 'text-white/40'}`}
          >
            Preview
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`px-4 py-2 text-sm ${activeTab === 'code' ? 'text-white bg-white/5' : 'text-white/40'}`}
          >
            Code
          </button>
        </div>
      )}
      {activeTab === 'preview' ? (
        <iframe
          srcDoc={srcDoc}
          src={src}
          style={{ width: '100%', height, border: 'none', background: '#0a0a0a' }}
          sandbox="allow-scripts"
          title={`Preview of ${slug}`}
        />
      ) : (
        <CodeBlock code={code ?? ''} />
      )}
    </div>
  )
}
```

---

## PIPELINE LOGIC (`lib/pipeline/`)

### `lib/pipeline/generate.ts` — unified generation with fallbacks

```typescript
import { enrichWithClaude, generateWithClaude, fixWithClaude } from '@/lib/ai/anthropic'
import { enrichWithGemini, generateWithGemini } from '@/lib/ai/gemini'
import { generateWithGroq } from '@/lib/ai/groq'
import { generateWithOllama } from '@/lib/ai/ollama'
import { buildEnrichPrompt, buildGenPrompt, CODE_GEN_SYSTEM_PROMPT } from './prompts'
import type { Idea, EnrichedSpec, GeneratedCode } from '@/types/pipeline'

export type AIMode = 'claude' | 'gemini' | 'groq' | 'ollama'

// Stage 2: Enrich idea into full spec
export async function enrichIdea(idea: Idea, mode: AIMode): Promise<EnrichedSpec> {
  const input = JSON.stringify({
    name: idea.name, type: idea.type, category: idea.category,
    tech: idea.tech, complexity: idea.complexity, feel: idea.feel
  })

  let raw: string
  if (mode === 'claude') raw = await enrichWithClaude(input)
  else if (mode === 'gemini') raw = await enrichWithGemini(input)
  else raw = await enrichWithGemini(input) // fallback for groq/ollama: gemini for enrich

  // Strip markdown fences if model added them
  const cleaned = raw.replace(/^```json\n?/m, '').replace(/```$/m, '').trim()
  return JSON.parse(cleaned)
}

// Stage 3: Generate code string from enriched spec
export async function generateCode(spec: EnrichedSpec, mode: AIMode): Promise<string> {
  const input = JSON.stringify(spec, null, 2)

  let raw: string
  if (mode === 'claude') raw = await generateWithClaude(input)
  else if (mode === 'gemini') raw = await generateWithGemini(input)
  else if (mode === 'groq') raw = await generateWithGroq(input)
  else raw = await generateWithOllama(input)

  // Clean the output — remove any accidental markdown, ensure it's clean code
  return cleanCodeOutput(raw)
}

// Stage 4: Validate + auto-fix (up to 3 attempts)
export async function validateAndFix(
  code: string, mode: AIMode, maxAttempts = 3
): Promise<GeneratedCode> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const validation = validateCodeString(code)
    
    if (validation.ok) {
      return { code, imports: [], has_errors: false }
    }
    
    if (attempt === maxAttempts) {
      return { code, imports: [], has_errors: true, validation_notes: validation.error }
    }

    // Auto-fix using Claude (best for code fixing) regardless of generation mode
    if (mode === 'claude') {
      code = await fixWithClaude(code, validation.error!)
    } else {
      // For free modes, use Gemini for fixing (it's free and handles code well)
      const { enrichWithGemini } = await import('@/lib/ai/gemini')
      const fixPrompt = `Fix this React component error:\n${validation.error}\n\nCode:\n${code}\n\nReturn ONLY the fixed code. No markdown.`
      code = await enrichWithGemini(fixPrompt)
    }
    code = cleanCodeOutput(code)
  }
  
  return { code, imports: [], has_errors: true }
}

function cleanCodeOutput(raw: string): string {
  return raw
    .replace(/^```(?:tsx?|jsx?|javascript|typescript)?\n?/m, '')
    .replace(/```$/m, '')
    .trim()
}

function validateCodeString(code: string): { ok: boolean; error?: string } {
  // Quick checks before expensive compilation
  if (!code.includes('export default function')) {
    return { ok: false, error: 'Missing: export default function ComponentName()' }
  }
  if (code.includes("import React from 'react'") || code.includes('import React from "react"')) {
    return { ok: false, error: 'Remove React import — React is a global in the sandbox' }
  }
  if (code.includes("import { motion") || code.includes("from 'framer-motion'")) {
    return { ok: false, error: 'Remove framer-motion import — use window.Motion instead' }
  }
  // Check brackets are balanced
  const opens = (code.match(/\{/g) || []).length
  const closes = (code.match(/\}/g) || []).length
  if (Math.abs(opens - closes) > 2) {
    return { ok: false, error: `Unbalanced braces: ${opens} open, ${closes} close` }
  }
  return { ok: true }
}
```

### `lib/pipeline/ingest.ts` — store to DB with embedding

```typescript
import { supabase } from '@/lib/db/supabase'
import { buildSandboxHTML } from '@/lib/preview/sandbox'
import OpenAI from 'openai'
import type { EnrichedSpec } from '@/types/pipeline'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function ingestAsset(
  ideaId: string,
  spec: EnrichedSpec,
  code: string,
  isPro = false
): Promise<{ ok: boolean; slug?: string; error?: string }> {
  const slug = spec.name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')

  // Generate embedding for semantic search
  // text-embedding-3-small: $0.02/million tokens — 1000 assets ≈ ₹2 total
  const embeddingInput = [
    spec.name,
    spec.description,
    spec.seo_description,
    ...spec.tags,
    ...(spec.animation_spec?.trigger ? [spec.animation_spec.trigger] : [])
  ].join(' ')

  const embRes = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: embeddingInput
  })

  // Cache compiled preview HTML to avoid re-compiling on every page load
  const preview_html = buildSandboxHTML(code)

  const { error } = await supabase.from('assets').upsert({
    slug,
    name: spec.name,
    category: 'animation', // or derive from spec
    type: spec.animation_spec?.trigger ?? 'component',
    code,                  // the raw string — this is the product
    preview_html,          // cached for fast rendering
    description: spec.description,
    seo_description: spec.seo_description,
    tags: spec.tags,
    tech: spec.tech,
    complexity: 'medium',
    animation_spec: spec.animation_spec,
    visual_spec: spec.visual_spec,
    is_pro: isPro,
    is_published: true,
    license: 'owned',
    embedding: embRes.data[0].embedding
  })

  if (error) return { ok: false, error: error.message }

  // Update idea status
  await supabase.from('ideas')
    .update({ status: 'approved' })
    .eq('id', ideaId)

  return { ok: true, slug }
}
```

---

## API ROUTES (`app/api/pipeline/`)

### `app/api/pipeline/generate/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { enrichIdea, generateCode, validateAndFix } from '@/lib/pipeline/generate'
import { supabase } from '@/lib/db/supabase'
import type { AIMode } from '@/lib/pipeline/generate'

export async function POST(req: NextRequest) {
  const { ideaId, mode = 'claude' }: { ideaId: string; mode: AIMode } = await req.json()

  // Fetch idea from DB
  const { data: idea, error } = await supabase
    .from('ideas').select('*').eq('id', ideaId).single()
  if (error || !idea) return NextResponse.json({ error: 'Idea not found' }, { status: 404 })

  // Stream progress back via SSE for real-time UI updates
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ event, ...data })}\n\n`))
      }

      try {
        // Stage 2: Enrich
        await supabase.from('ideas').update({ status: 'enriching' }).eq('id', ideaId)
        send('status', { stage: 'enriching', message: 'Researching animation behaviour...' })
        const spec = await enrichIdea(idea, mode)
        await supabase.from('ideas').update({ status: 'enriched', enriched_spec: spec }).eq('id', ideaId)
        send('enriched', { spec })

        // Stage 3: Generate
        await supabase.from('ideas').update({ status: 'generating' }).eq('id', ideaId)
        send('status', { stage: 'generating', message: 'Writing component code...' })
        const rawCode = await generateCode(spec, mode)
        await supabase.from('ideas').update({ status: 'generated' }).eq('id', ideaId)
        send('generated', { code: rawCode })

        // Stage 4: Validate
        await supabase.from('ideas').update({ status: 'validating' }).eq('id', ideaId)
        send('status', { stage: 'validating', message: 'Validating and fixing...' })
        const result = await validateAndFix(rawCode, mode)
        await supabase.from('ideas').update({ status: 'validated' }).eq('id', ideaId)
        send('validated', { code: result.code, has_errors: result.has_errors })

        // Move to review queue
        await supabase.from('ideas').update({ status: 'reviewing' }).eq('id', ideaId)
        send('ready', { message: 'Ready for manual review', ideaId, code: result.code })

      } catch (err: any) {
        await supabase.from('ideas')
          .update({ status: 'failed', error_log: err.message }).eq('id', ideaId)
        send('error', { message: err.message })
      } finally {
        controller.close()
      }
    }
  })

  return new NextResponse(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }
  })
}
```

---

## PIPELINE DASHBOARD UI (`app/(dashboard)/pipeline/page.tsx`)

```typescript
'use client'
import { useState } from 'react'
import IdeaEditor from '@/components/pipeline/IdeaEditor'
import PipelineRunner from '@/components/pipeline/PipelineRunner'
import ManualPipeline from '@/components/pipeline/ManualPipeline'
import ReviewQueue from '@/components/pipeline/ReviewQueue'

type PipelineMode = 'auto' | 'manual'
type AIMode = 'claude' | 'gemini' | 'groq' | 'ollama'

export default function PipelinePage() {
  const [mode, setMode] = useState<PipelineMode>('auto')
  const [aiMode, setAiMode] = useState<AIMode>('claude')
  const [activeTab, setActiveTab] = useState<'ideas' | 'run' | 'review'>('ideas')

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header + mode selector */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-medium">Asset Pipeline</h1>
          <div className="flex gap-2">
            {/* Pipeline mode */}
            <div className="flex rounded-lg border border-white/10 overflow-hidden">
              {(['auto', 'manual'] as const).map(m => (
                <button key={m}
                  onClick={() => setMode(m)}
                  className={`px-4 py-2 text-sm capitalize ${mode === m ? 'bg-white/10 text-white' : 'text-white/40'}`}
                >
                  {m}
                </button>
              ))}
            </div>
            {/* AI provider selector */}
            <select
              value={aiMode}
              onChange={e => setAiMode(e.target.value as AIMode)}
              className="bg-neutral-900 border border-white/10 text-white text-sm rounded-lg px-3 py-2"
            >
              <option value="claude">Claude (paid, best)</option>
              <option value="gemini">Gemini Flash (free)</option>
              <option value="groq">Groq / Llama (free)</option>
              <option value="ollama">Ollama (local, free)</option>
            </select>
          </div>
        </div>

        {/* Tab nav */}
        <div className="flex gap-1 border-b border-white/10">
          {(['ideas', 'run', 'review'] as const).map(tab => (
            <button key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm capitalize border-b-2 -mb-px ${
                activeTab === tab ? 'border-white text-white' : 'border-transparent text-white/40'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'ideas' && <IdeaEditor />}
        {activeTab === 'run' && (
          mode === 'auto'
            ? <PipelineRunner aiMode={aiMode} />
            : <ManualPipeline aiMode={aiMode} />
        )}
        {activeTab === 'review' && <ReviewQueue />}
      </div>
    </div>
  )
}
```

---

## MANUAL PIPELINE COMPONENT (`components/pipeline/ManualPipeline.tsx`)

For when you're using free AI and want to paste results in manually at each step.

```typescript
'use client'
import { useState } from 'react'
import AssetPreview from '@/components/assets/AssetPreview'
import { buildEnrichPrompt, buildGenPrompt, CODE_GEN_SYSTEM_PROMPT } from '@/lib/pipeline/prompts'

const FREE_AI_LINKS = {
  gemini: 'https://aistudio.google.com/prompts/new_chat',
  groq: 'https://console.groq.com/playground',
  chatgpt: 'https://chat.openai.com',
  claude: 'https://claude.ai',
}

export default function ManualPipeline({ aiMode }: { aiMode: string }) {
  const [stage, setStage] = useState<1 | 2 | 3 | 4>(1)
  const [ideaJson, setIdeaJson] = useState('')
  const [enrichedJson, setEnrichedJson] = useState('')
  const [generatedCode, setGeneratedCode] = useState('')
  const [isApproving, setIsApproving] = useState(false)

  const enrichPrompt = ideaJson ? buildEnrichPrompt(ideaJson) : ''
  const genPrompt = enrichedJson ? buildGenPrompt(enrichedJson) : ''

  async function handleApprove() {
    setIsApproving(true)
    const res = await fetch('/api/pipeline/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: generatedCode, spec: JSON.parse(enrichedJson) })
    })
    const data = await res.json()
    if (data.ok) {
      alert(`Published: ${data.slug}`)
      setStage(1); setIdeaJson(''); setEnrichedJson(''); setGeneratedCode('')
    }
    setIsApproving(false)
  }

  return (
    <div className="space-y-6">
      {/* Stage indicators */}
      <div className="flex gap-2">
        {[1,2,3,4].map(s => (
          <div key={s} className={`flex-1 h-1 rounded-full ${stage >= s ? 'bg-white' : 'bg-white/10'}`} />
        ))}
      </div>

      {/* Stage 1: Input idea */}
      {stage === 1 && (
        <div className="space-y-3">
          <p className="text-sm text-white/60">Paste your idea as JSON, or type it</p>
          <textarea
            value={ideaJson}
            onChange={e => setIdeaJson(e.target.value)}
            placeholder={'{\n  "name": "Magnetic button",\n  "type": "hover",\n  "category": "buttons",\n  "tech": ["GSAP"],\n  "feel": "springy"\n}'}
            className="w-full h-48 bg-neutral-900 border border-white/10 rounded-lg p-4
                       font-mono text-sm text-white/80 focus:outline-none focus:border-white/30"
          />
          <button onClick={() => setStage(2)} disabled={!ideaJson.trim()}
            className="px-6 py-2 bg-white text-black rounded-lg text-sm font-medium disabled:opacity-30">
            Next: Get Enrich Prompt
          </button>
        </div>
      )}

      {/* Stage 2: Copy enrich prompt, paste result */}
      {stage === 2 && (
        <div className="space-y-4">
          <div className="rounded-lg border border-white/10 p-4 space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-sm text-white/60">Copy this prompt → paste into{' '}
                <a href={FREE_AI_LINKS[aiMode as keyof typeof FREE_AI_LINKS] ?? FREE_AI_LINKS.gemini}
                   target="_blank" className="text-blue-400 underline capitalize">{aiMode}</a>
              </p>
              <button onClick={() => navigator.clipboard.writeText(enrichPrompt)}
                className="text-xs text-white/40 hover:text-white px-3 py-1 border border-white/10 rounded">
                Copy prompt
              </button>
            </div>
            <pre className="text-xs text-white/40 bg-neutral-900 rounded p-3 overflow-auto max-h-48">
              {enrichPrompt}
            </pre>
          </div>
          <p className="text-sm text-white/60">Paste the JSON response here:</p>
          <textarea
            value={enrichedJson}
            onChange={e => setEnrichedJson(e.target.value)}
            placeholder="Paste the enriched spec JSON from the AI here..."
            className="w-full h-48 bg-neutral-900 border border-white/10 rounded-lg p-4
                       font-mono text-sm text-white/80 focus:outline-none focus:border-white/30"
          />
          <div className="flex gap-3">
            <button onClick={() => setStage(1)} className="px-4 py-2 text-sm text-white/40">Back</button>
            <button onClick={() => setStage(3)} disabled={!enrichedJson.trim()}
              className="px-6 py-2 bg-white text-black rounded-lg text-sm font-medium disabled:opacity-30">
              Next: Get Code Prompt
            </button>
          </div>
        </div>
      )}

      {/* Stage 3: Copy gen prompt, paste code */}
      {stage === 3 && (
        <div className="space-y-4">
          <div className="rounded-lg border border-white/10 p-4 space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-sm text-white/60">Copy this prompt (includes system prompt + spec)</p>
              <button onClick={() => navigator.clipboard.writeText(`${CODE_GEN_SYSTEM_PROMPT}\n\n${genPrompt}`)}
                className="text-xs text-white/40 hover:text-white px-3 py-1 border border-white/10 rounded">
                Copy full prompt
              </button>
            </div>
          </div>
          <p className="text-sm text-white/60">Paste the generated code here:</p>
          <textarea
            value={generatedCode}
            onChange={e => setGeneratedCode(e.target.value)}
            placeholder="Paste the component code from the AI here..."
            className="w-full h-64 bg-neutral-900 border border-white/10 rounded-lg p-4
                       font-mono text-sm text-white/80 focus:outline-none focus:border-white/30"
          />
          <div className="flex gap-3">
            <button onClick={() => setStage(2)} className="px-4 py-2 text-sm text-white/40">Back</button>
            <button onClick={() => setStage(4)} disabled={!generatedCode.trim()}
              className="px-6 py-2 bg-white text-black rounded-lg text-sm font-medium disabled:opacity-30">
              Preview & Approve
            </button>
          </div>
        </div>
      )}

      {/* Stage 4: Preview + approve */}
      {stage === 4 && (
        <div className="space-y-4">
          <AssetPreview slug="preview" code={generatedCode} height={400} showCode />
          <div className="flex gap-3">
            <button onClick={() => setStage(3)} className="px-4 py-2 text-sm text-white/40">
              Back to edit
            </button>
            <button onClick={() => setStage(3)}
              className="px-6 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm">
              Reject
            </button>
            <button onClick={handleApprove} disabled={isApproving}
              className="px-6 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm font-medium disabled:opacity-50">
              {isApproving ? 'Publishing...' : 'Approve + Publish'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

---

## SEMANTIC SEARCH (`lib/db/search.ts`)

```typescript
import { supabase } from './supabase'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function semanticSearch(query: string, limit = 12) {
  // Embed the user's query
  const embRes = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query
  })

  // Vector similarity search in Supabase
  const { data, error } = await supabase.rpc('search_assets', {
    query_embedding: embRes.data[0].embedding,
    similarity_threshold: 0.25,
    match_count: limit
  })

  if (error) throw error
  return data
}

// Fallback: keyword search when no embedding key available
export async function keywordSearch(query: string, limit = 12) {
  const { data } = await supabase
    .from('assets')
    .select('id, slug, name, category, type, description, tags, tech, complexity, is_pro')
    .eq('is_published', true)
    .or(`name.ilike.%${query}%,description.ilike.%${query}%,tags.cs.{${query}}`)
    .limit(limit)
  return data
}
```

---

## ENVIRONMENT VARIABLES (`.env.local`)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...  # server-only

# Paid AI (for auto pipeline)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...  # for embeddings only — cheap

# Free AI (for manual/free pipeline)
GEMINI_API_KEY=AIza...     # get free at aistudio.google.com
GROQ_API_KEY=gsk_...       # get free at console.groq.com
# OLLAMA runs locally — no key needed

# Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# Payments
LEMON_SQUEEZY_API_KEY=...
LEMON_SQUEEZY_STORE_ID=...
LEMON_SQUEEZY_WEBHOOK_SECRET=...
```

---

## PACKAGE.JSON SCRIPTS

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "pipeline:enrich": "npx tsx scripts/run-pipeline.ts enrich",
    "pipeline:generate": "npx tsx scripts/run-pipeline.ts generate",
    "pipeline:full": "npx tsx scripts/run-pipeline.ts full",
    "db:migrate": "npx supabase db push",
    "db:seed": "npx tsx scripts/seed-ideas.ts"
  },
  "dependencies": {
    "next": "14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "typescript": "^5.4.0",
    "@supabase/supabase-js": "^2.43.0",
    "@anthropic-ai/sdk": "^0.24.0",
    "openai": "^4.52.0",
    "groq-sdk": "^0.5.0",
    "tailwindcss": "^3.4.0",
    "clsx": "^2.1.1",
    "@clerk/nextjs": "^5.2.0",
    "shiki": "^1.10.0"
  },
  "devDependencies": {
    "tsx": "^4.15.0",
    "@types/node": "^20.0.0",
    "eslint": "^8.0.0",
    "eslint-config-next": "14.2.0",
    "prettier": "^3.3.0"
  }
}
```

---

## BUILD INSTRUCTIONS FOR CURSOR / CLAUDE CODE

When implementing this project, follow this exact order:

1. `pnpm create next-app veloxui --typescript --tailwind --app --src-dir=false`
2. Install all dependencies from package.json above
3. Set up Supabase project, enable pgvector, run the migration SQL
4. Create `.env.local` with all keys
5. Build in this order:
   - `types/` first (zero dependencies)
   - `lib/db/supabase.ts` (client setup)
   - `lib/ai/` (all four AI clients)
   - `lib/pipeline/prompts.ts` (the prompts — most critical)
   - `lib/pipeline/generate.ts` (uses prompts + AI clients)
   - `lib/pipeline/ingest.ts` (uses DB + OpenAI)
   - `lib/preview/sandbox.ts` (standalone, no deps)
   - `app/api/` routes
   - `components/` (start with AssetPreview, then others)
   - `app/` pages last
6. Test the preview sandbox first with a hardcoded component string
7. Test Stage 2 (enrich) with one idea before running the full pipeline
8. Run `pnpm pipeline:full` to produce 20 assets in one shot

---

## WHY STORE CODE AS A STRING, NOT A FILE

This is a fundamental architectural choice — here's the complete reasoning:

**File-based (old approach):**
- Need a file system to read from
- Hard to search or query component content
- Requires build step to render
- Users download a file — harder to gate for paid tier
- Hard to version or diff programmatically

**String-in-DB (this approach):**
- Code is just another column — queryable, sortable, filterable
- Preview is instant: inject string into sandbox HTML template
- Users see a copy button — you control what they can copy
- Pro gating is trivial: don't return the `code` field for non-pro users
- Semantic search works on code content as well as metadata
- Can store multiple versions (v1, v2) easily
- Works perfectly with the AI pipeline: gen → validate → insert (no file I/O)
- Export to file is trivial: `fs.writeFileSync('component.tsx', asset.code)` when needed

