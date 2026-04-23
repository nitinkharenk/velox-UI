-- Migration 011: Schema Alignment Fix
-- This migration aligns the `ideas` table schema with the TypeScript types
-- by idempotently adding any missing critical fields that cause silent API dropbacks.

-- 1. Add `generated_code` (text)
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS generated_code TEXT;

-- 2. Add `updated_at` (timestamp, timezone)
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Ensure `prompt` exists
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS prompt TEXT;

-- 4. Ensure `format` exists and has the correct constraint
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS format TEXT DEFAULT 'component';

ALTER TABLE ideas DROP CONSTRAINT IF EXISTS idea_format_check;
ALTER TABLE ideas ADD CONSTRAINT idea_format_check CHECK (format IN ('component', 'section', 'template', 'page'));
