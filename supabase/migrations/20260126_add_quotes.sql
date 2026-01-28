-- Quotes table for generated PDFs with 7-day expiry
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quote_status') THEN
    CREATE TYPE quote_status AS ENUM ('created','sent','downloaded','expired');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  gst_included boolean NOT NULL DEFAULT false,
  expiry_at timestamptz NOT NULL,
  summary text,
  selections jsonb,
  pdf_url text,
  status quote_status NOT NULL DEFAULT 'created',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quotes_user_idx ON public.quotes(user_id);
CREATE INDEX IF NOT EXISTS quotes_expiry_idx ON public.quotes(expiry_at);
