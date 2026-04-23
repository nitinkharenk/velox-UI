create table pipelines (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  is_default boolean default false,
  created_at timestamptz default now()
);

-- Ensure only one default exists
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

-- Ensure step_order is unique per pipeline
create unique index pipeline_stages_order_idx on pipeline_stages(pipeline_id, step_order);

-- Seed Initial Pipeline
insert into pipelines (name, description, is_default) values 
  ('Factory Default Workflow', 'Standard multi-stage pipeline using Claude for research and generation.', true);

-- Seed Initial Stages
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
