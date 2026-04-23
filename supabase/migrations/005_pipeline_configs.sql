create table pipeline_configs (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  model          text not null,
  provider       text not null default 'anthropic',
  system_prompt  text,
  is_default     boolean default false,
  created_at     timestamptz default now()
);

-- Ensure only one default exists
create unique index pipeline_configs_default_idx on pipeline_configs(is_default) where is_default = true;

-- Insert default presets
insert into pipeline_configs (name, model, provider, is_default) values
  ('Claude 3.5 Sonnet', 'claude-3-5-sonnet-20240620', 'anthropic', true),
  ('Claude 3.5 Haiku', 'claude-3-5-haiku-20241022', 'anthropic', false),
  ('Gemini 1.5 Flash', 'gemini-1.5-flash', 'gemini', false),
  ('Llama 3.3 70B', 'llama-3.3-70b-versatile', 'groq', false);
