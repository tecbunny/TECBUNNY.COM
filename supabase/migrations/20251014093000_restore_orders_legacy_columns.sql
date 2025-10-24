-- Restore legacy columns expected by the application for orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS type order_type DEFAULT 'Delivery',
  ADD COLUMN IF NOT EXISTS gst_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS processed_by UUID,
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS delivery_address TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS payment_status TEXT,
  ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_amount DECIMAL(10,2) DEFAULT 0;

-- Backfill legacy columns from newer schema fields when possible
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'order_type'
  ) THEN
    EXECUTE format($sql$
      UPDATE public.orders
         SET type = COALESCE(public.orders.type, public.orders.order_type, 'Delivery')
       WHERE public.orders.type IS NULL
    $sql$);
  ELSE
    EXECUTE format($sql$
      UPDATE public.orders
         SET type = COALESCE(public.orders.type, 'Delivery')
       WHERE public.orders.type IS NULL
    $sql$);
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'tax_amount'
  ) THEN
    EXECUTE format($sql$
      UPDATE public.orders
         SET gst_amount = COALESCE(public.orders.gst_amount, public.orders.tax_amount, 0)
       WHERE public.orders.gst_amount IS NULL
    $sql$);
  ELSE
    EXECUTE format($sql$
      UPDATE public.orders
         SET gst_amount = COALESCE(public.orders.gst_amount, 0)
       WHERE public.orders.gst_amount IS NULL
    $sql$);
  END IF;
END
$$;

-- Refresh PostgREST schema cache so the new columns are immediately available
NOTIFY pgrst, 'reload schema';
