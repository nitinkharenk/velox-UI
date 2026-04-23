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
