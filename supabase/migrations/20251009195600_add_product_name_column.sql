-- Add name column to products table for frontend compatibility
-- The frontend expects a 'name' field but the table has 'title'

ALTER TABLE products
ADD COLUMN IF NOT EXISTS name TEXT;

-- Update existing records to copy title to name
UPDATE products
SET name = title
WHERE name IS NULL AND title IS NOT NULL;

-- Create index for the name column
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

-- Add a trigger to keep name in sync with title
CREATE OR REPLACE FUNCTION sync_product_name()
RETURNS TRIGGER AS $$
BEGIN
  -- If name is being updated and title isn't, sync title to name
  IF TG_OP = 'UPDATE' AND OLD.name IS DISTINCT FROM NEW.name AND OLD.title = NEW.title THEN
    NEW.title = NEW.name;
  -- If title is being updated and name isn't, sync name to title
  ELSIF TG_OP = 'UPDATE' AND OLD.title IS DISTINCT FROM NEW.title AND OLD.name = NEW.name THEN
    NEW.name = NEW.title;
  -- For INSERT, if name is null but title exists, copy title to name
  ELSIF TG_OP = 'INSERT' AND NEW.name IS NULL AND NEW.title IS NOT NULL THEN
    NEW.name = NEW.title;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_product_name
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION sync_product_name();