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
