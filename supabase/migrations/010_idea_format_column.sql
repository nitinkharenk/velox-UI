-- Add format column to ideas table
alter table ideas add column if not exists format text default 'component';

-- Add check constraint for format
alter table ideas drop constraint if exists idea_format_check;
alter table ideas add constraint idea_format_check check (format in ('component', 'section', 'template', 'page'));
