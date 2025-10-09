-- Fix settings table policies to properly allow public access to public settings

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage settings" ON settings;
DROP POLICY IF EXISTS "Public can read public settings" ON settings;

-- Recreate policies with proper public access
CREATE POLICY "Public can read public settings" ON settings
  FOR SELECT USING (
    key NOT LIKE 'payment_%' AND key NOT LIKE 'security_%' AND key NOT LIKE 'admin_%'
  );

CREATE POLICY "Admins can manage settings" ON settings
  FOR ALL USING (is_staff(auth.uid()));

-- Also ensure the settings table has the required data
INSERT INTO settings (key, value) VALUES
  ('siteName', '"TecBunny"'),
  ('faviconUrl', '"/brand.png"'),
  ('logoUrl', '"/brand.png"'),
  ('tagline', '"Your Tech Partner"'),
  ('primaryColor', '"#dc2626"'),
  ('secondaryColor', '"#f3f4f6"'),
  ('accentColor', '"#2563eb"'),
  ('heroTitle', '"Welcome to TecBunny"'),
  ('heroSubtitle', '"Your trusted technology partner"'),
  ('heroButtonText', '"Shop Now"'),
  ('heroButtonLink', '"/products"'),
  ('companyName', '"TecBunny Solutions"'),
  ('address', '"Your Address"'),
  ('city', '"Your City"'),
  ('state', '"Your State"'),
  ('zipCode', '"123456"'),
  ('phone', '"9604136010"'),
  ('email', '"tecbunnysolution@gmail.com"')
ON CONFLICT (key) DO NOTHING;