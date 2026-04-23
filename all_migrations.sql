create extension if not exists vector;
create table assets (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  name         text not null,
  category     text not null check (category in ('animation','component','template')),
  type         text not null,
  code         text not null,
  preview_html text,
  description  text not null,
  seo_description text,
  tags         text[] default '{}',
  tech         text[] default '{}',
  complexity   text check (complexity in ('low','medium','high')),
  animation_spec jsonb,
  visual_spec  jsonb,
  is_pro       boolean default false,
  is_published boolean default false,
  license      text default 'owned',
  pipeline_mode text default 'auto',
  embedding    vector(1536),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
create table ideas (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  type         text not null,
  category     text not null,
  tech         text[],
  complexity   text,
  feel         text,
  enriched_spec jsonb,
  status       text default 'pending' check (status in (
    'pending','enriching','enriched','generating','generated',
    'validating','validated','reviewing','approved','rejected','failed'
  )),
  error_log    text,
  created_at   timestamptz default now()
);
create table pipeline_runs (
  id           uuid primary key default gen_random_uuid(),
  mode         text not null,
  idea_ids     uuid[],
  total        int default 0,
  approved     int default 0,
  rejected     int default 0,
  failed       int default 0,
  started_at   timestamptz default now(),
  completed_at timestamptz
);
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
create index on assets using ivfflat (embedding vector_cosine_ops);
create index on assets (category);
create index on assets (is_published);
create index on assets (is_pro);
create index on ideas (status);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS copy_count INTEGER DEFAULT 0;
CREATE OR REPLACE FUNCTION increment_asset_view(asset_slug TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE assets
  SET views_count = views_count + 1
  WHERE slug = asset_slug;
END;
$$;
CREATE OR REPLACE FUNCTION increment_asset_copy(asset_slug TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE assets
  SET copy_count = copy_count + 1
  WHERE slug = asset_slug;
END;
$$;
CREATE TABLE asset_versions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_slug text REFERENCES assets(slug) ON DELETE CASCADE,
  code text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE asset_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone" ON asset_versions FOR SELECT USING (true);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS upvotes INTEGER DEFAULT 0;
CREATE OR REPLACE FUNCTION increment_asset_upvote(asset_slug TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE assets
  SET upvotes = COALESCE(upvotes, 0) + 1
  WHERE slug = asset_slug;
END;
$$;
create table pipeline_configs (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  model          text not null,
  provider       text not null default 'anthropic',
  system_prompt  text,
  is_default     boolean default false,
  created_at     timestamptz default now()
);
create unique index pipeline_configs_default_idx on pipeline_configs(is_default) where is_default = true;
insert into pipeline_configs (name, model, provider, is_default) values
  ('Claude 3.5 Sonnet', 'claude-3-5-sonnet-20240620', 'anthropic', true),
  ('Claude 3.5 Haiku', 'claude-3-5-haiku-20241022', 'anthropic', false),
  ('Gemini 1.5 Flash', 'gemini-1.5-flash', 'gemini', false),
  ('Llama 3.3 70B', 'llama-3.3-70b-versatile', 'groq', false);
create table pipelines (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  is_default boolean default false,
  created_at timestamptz default now()
);
create unique index pipelines_default_idx on pipelines(is_default) where is_default = true;
create type pipeline_action_type as enum ('enrich_spec', 'generate_code', 'validate_code');
create table pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  pipeline_id uuid references pipelines(id) on delete cascade not null,
  step_order integer not null,
  name text not null,
  action_type pipeline_action_type not null,
  provider text not null,
  model text not null,
  system_prompt text,
  created_at timestamptz default now()
);
create unique index pipeline_stages_order_idx on pipeline_stages(pipeline_id, step_order);
insert into pipelines (name, description, is_default) values 
  ('Factory Default Workflow', 'Standard multi-stage pipeline using Claude for research and generation.', true);
DO $$
DECLARE
  v_pipeline_id uuid;
BEGIN
  SELECT id INTO v_pipeline_id FROM pipelines WHERE name = 'Factory Default Workflow';
  insert into pipeline_stages (pipeline_id, step_order, name, action_type, provider, model, system_prompt) values
    (v_pipeline_id, 1, 'Research Specs', 'enrich_spec', 'anthropic', 'claude-3-5-sonnet-20240620', null),
    (v_pipeline_id, 2, 'Draft Code', 'generate_code', 'anthropic', 'claude-3-5-sonnet-20240620', null),
    (v_pipeline_id, 3, 'Review & Fix', 'validate_code', 'anthropic', 'claude-3-5-sonnet-20240620', 'Follow strict styling guidelines.');
END $$;
alter table public.ideas
  drop constraint if exists ideas_status_check;
alter table public.ideas
  add constraint ideas_status_check
  check (
    status in (
      'pending',
      'enriching',
      'enriched',
      'generating',
      'generated',
      'validating',
      'validated',
      'ready',
      'ready_with_warnings',
      'reviewing',
      'repair_required',
      'approved',
      'rejected',
      'failed'
    )
  );
update public.ideas
set
  status = 'repair_required',
  error_log = coalesce(error_log, 'Missing generated_code while in a review-facing status.')
where
  status in ('reviewing', 'ready', 'ready_with_warnings', 'validated', 'generated')
  and coalesce(trim(generated_code), '') = '';
alter table ideas add column if not exists prompt text;
create table if not exists ai_providers (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  provider_id    text not null unique, -- lowercase slug, e.g. 'deepseek'
  default_model  text not null,
  base_url       text, -- optional custom base URL for OpenAI-compatible APIs
  env_key        text not null, -- e.g. 'DEEPSEEK_API_KEY'
  created_at     timestamptz default now()
);
alter table ideas add column if not exists format text default 'component';
alter table ideas drop constraint if exists idea_format_check;
alter table ideas add constraint idea_format_check check (format in ('component', 'section', 'template', 'page'));
