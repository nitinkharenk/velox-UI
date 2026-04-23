-- Migration 012: Continuity & Activity
-- This migration automates `updated_at` timestamps and enhances versioning reliability.

-- 1. Create the trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Apply triggers to `ideas` and `assets`
DROP TRIGGER IF EXISTS tr_ideas_updated_at ON ideas;
CREATE TRIGGER tr_ideas_updated_at
  BEFORE UPDATE ON ideas
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS tr_assets_updated_at ON assets;
CREATE TRIGGER tr_assets_updated_at
  BEFORE UPDATE ON assets
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- 3. Enhance `asset_versions` with snapshot context
-- `spec_snapshot`: Stores the EnrichedSpec JSON at the time of publish
ALTER TABLE asset_versions ADD COLUMN IF NOT EXISTS spec_snapshot JSONB;

-- `source_idea_id`: Links back to the original pipeline thought (optional)
ALTER TABLE asset_versions ADD COLUMN IF NOT EXISTS source_idea_id UUID;
