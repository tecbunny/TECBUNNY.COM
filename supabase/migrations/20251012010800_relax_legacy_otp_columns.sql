-- Allow legacy otp_code column to be nullable now that "code" column is used
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
          FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'otp_verifications'
           AND column_name = 'otp_code'
    ) THEN
        ALTER TABLE public.otp_verifications
            ALTER COLUMN otp_code DROP NOT NULL;
    END IF;

    IF EXISTS (
        SELECT 1
          FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'otp_verifications'
           AND column_name = 'otp'
    ) THEN
        ALTER TABLE public.otp_verifications
            ALTER COLUMN otp DROP NOT NULL;
    END IF;
END$$;
