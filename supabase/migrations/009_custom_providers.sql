-- Create ai_providers table to store user-defined AI providers
create table if not exists ai_providers (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  provider_id    text not null unique, -- lowercase slug, e.g. 'deepseek'
  default_model  text not null,
  base_url       text, -- optional custom base URL for OpenAI-compatible APIs
  env_key        text not null, -- e.g. 'DEEPSEEK_API_KEY'
  created_at     timestamptz default now()
);

-- Ensure base providers are not overwritten or duplicate if people try to add them
-- (Existing: anthropic, openai, gemini, groq, vertex, ollama)
-- This is more for UI logic, but good to have a table ready.
