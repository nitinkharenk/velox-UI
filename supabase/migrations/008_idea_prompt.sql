-- Add free-form prompt field to ideas table.
-- Nullable — all existing rows default to NULL with no side-effects.
alter table ideas add column if not exists prompt text;
