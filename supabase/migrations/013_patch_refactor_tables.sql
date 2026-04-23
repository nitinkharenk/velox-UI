-- Migration: 013_patch_refactor_tables.sql
-- Description: Adds idea_issues and idea_patches tables to support surgical AI repair.

create table if not exists idea_issues (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid references ideas(id) on delete cascade,
  stage text not null,           -- 'validate' | 'repair'
  line_start integer not null,
  line_end integer not null,
  issue_type text not null,      -- 'syntax' | 'logic' | 'style' | 'other'
  description text not null,
  created_at timestamptz default now()
);

create table if not exists idea_patches (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid references ideas(id) on delete cascade,
  search_str text not null,
  replace_str text not null,
  applied boolean default false,
  created_at timestamptz default now()
);

-- Index for performance during lookups
create index if not exists idx_idea_issues_idea_id on idea_issues(idea_id);
create index if not exists idx_idea_patches_idea_id on idea_patches(idea_id);
