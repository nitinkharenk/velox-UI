CREATE TABLE asset_versions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_slug text REFERENCES assets(slug) ON DELETE CASCADE,
  code text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Allow public reads, restrict updates to authenticated roles if necessary
ALTER TABLE asset_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone" ON asset_versions FOR SELECT USING (true);
