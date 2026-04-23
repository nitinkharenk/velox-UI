# Velox UI

> Components, alive.

AI-powered animated React component library. Describe a component, get production-ready motion code — built on Next.js, Framer Motion, Tailwind CSS, and Supabase.

## What it is

Velox UI has two sides:

- **Public library** — browse and copy animated React components
- **Generation pipeline** — submit ideas, enrich with AI, generate and publish components

## Stack

- Next.js 16 + React 19
- TypeScript
- Tailwind CSS v4
- Framer Motion
- Supabase + pgvector
- Anthropic Claude (primary AI)
- OpenAI, Gemini, Groq, Ollama (optional providers)

## Getting started

```bash
git clone https://github.com/yourname/veloxui
cd veloxui
npm install
cp .env.example .env.local
# Fill in your Supabase and AI provider keys
npm run dev
```

## Pipeline commands

```bash
npm run pipeline:enrich    # enrich pending ideas
npm run pipeline:generate  # generate component code
npm run pipeline:full      # run full pipeline
npm run db:seed            # seed the ideas table
```

## Environment variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GEMINI_API_KEY=
GROQ_API_KEY=
PIPELINE_API_SECRET=
```

## License

MIT
