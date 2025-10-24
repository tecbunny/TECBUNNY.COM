-- Ensure otp_verifications table has the "code" column used by the multi-channel manager
ALTER TABLE public.otp_verifications
    ADD COLUMN IF NOT EXISTS code text;

-- For legacy data, backfill from older column names if present
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
          FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'otp_verifications'
           AND column_name = 'otp_code'
    ) THEN
        UPDATE public.otp_verifications
           SET code = COALESCE(code, otp_code);
    END IF;

    IF EXISTS (
        SELECT 1
          FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'otp_verifications'
           AND column_name = 'otp'
    ) THEN
        UPDATE public.otp_verifications
           SET code = COALESCE(code, otp);
    END IF;
END$$;
