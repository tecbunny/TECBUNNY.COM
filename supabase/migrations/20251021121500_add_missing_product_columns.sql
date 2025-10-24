-- Add missing product metadata columns to support admin updates
ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[],
    ADD COLUMN IF NOT EXISTS hsn_code text,
    ADD COLUMN IF NOT EXISTS mrp numeric(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS price numeric(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS created_by uuid,
    ADD COLUMN IF NOT EXISTS updated_by uuid;

-- Ensure PostgREST notices the new columns immediately
NOTIFY pgrst, 'reload schema';
