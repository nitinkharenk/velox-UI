-- Enable pgvector
create extension if not exists vector;

-- Core assets table
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

-- Ideas backlog table
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

-- Pipeline runs log
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
