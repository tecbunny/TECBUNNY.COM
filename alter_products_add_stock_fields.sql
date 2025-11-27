-- =============================================
-- Template: Add stock tracking columns to products
-- Run in Supabase SQL editor or psql after reviewing.
-- Ensures products table has quantity, thresholds, and stock status support.
-- =============================================

BEGIN;

-- Ensure numeric stock columns exist with sane defaults
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS stock_quantity integer NOT NULL DEFAULT 0;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS min_stock_level integer NOT NULL DEFAULT 0;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS max_stock_level integer NOT NULL DEFAULT 0;

-- Handle stock_status depending on existing type (text vs enum)
DO $$
BEGIN
  -- If products.stock_status already exists as a column we reuse it, otherwise create it.
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND column_name = 'stock_status'
  ) THEN
    ALTER TABLE public.products
      ADD COLUMN stock_status text NOT NULL DEFAULT 'in_stock';
  END IF;

  -- If the column uses a dedicated enum type, add the backorder label when missing.
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'products'
      AND c.column_name = 'stock_status'
      AND c.data_type = 'USER-DEFINED'
      AND c.udt_name = 'stock_status'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE t.typname = 'stock_status'
        AND e.enumlabel = 'backorder'
    ) THEN
      ALTER TYPE stock_status ADD VALUE 'backorder';
    END IF;
  ELSE
    -- Otherwise the column is text; enforce allowed values if the check is absent.
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'products_stock_status_check'
        AND conrelid = 'public.products'::regclass
    ) THEN
      ALTER TABLE public.products
        ADD CONSTRAINT products_stock_status_check
        CHECK (stock_status IN ('in_stock', 'low_stock', 'out_of_stock', 'backorder'));
    END IF;
  END IF;
END
$$;

-- Backfill any rows lacking a stock_status value
UPDATE public.products
   SET stock_status = 'in_stock'
 WHERE stock_status IS NULL;

COMMIT;

-- Ask PostgREST to reload its cached schema (safe to ignore notice if pgrst channel is unavailable)
DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_function OR invalid_schema_name OR insufficient_privilege THEN
    RAISE NOTICE 'Manual PostgREST schema reload required (pg_notify failed): %', SQLERRM;
END
$$;
