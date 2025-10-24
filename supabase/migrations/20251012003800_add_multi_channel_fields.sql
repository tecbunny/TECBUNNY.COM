-- Add missing columns required for multi-channel OTP flows
ALTER TABLE public.otp_verifications
    ADD COLUMN IF NOT EXISTS channel text DEFAULT 'email';

ALTER TABLE public.otp_verifications
    ADD COLUMN IF NOT EXISTS fallback_channels text[] DEFAULT '{}'::text[];

ALTER TABLE public.otp_verifications
    ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz;

ALTER TABLE public.otp_verifications
    ADD COLUMN IF NOT EXISTS verified_at timestamptz;

-- Ensure existing rows have non-null defaults for the new array column
UPDATE public.otp_verifications
   SET fallback_channels = '{}'::text[]
 WHERE fallback_channels IS NULL;

-- Backfill channel for any rows created before this migration
UPDATE public.otp_verifications
   SET channel = 'email'
 WHERE channel IS NULL;
