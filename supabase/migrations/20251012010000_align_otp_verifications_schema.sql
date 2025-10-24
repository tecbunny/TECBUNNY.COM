-- Align otp_verifications schema with multi-channel OTP manager expectations
ALTER TABLE public.otp_verifications
    ADD COLUMN IF NOT EXISTS phone text,
    ADD COLUMN IF NOT EXISTS email text,
    ADD COLUMN IF NOT EXISTS purpose text,
    ADD COLUMN IF NOT EXISTS attempts integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS max_attempts integer DEFAULT 3,
    ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS expires_at timestamptz,
    ADD COLUMN IF NOT EXISTS user_id uuid,
    ADD COLUMN IF NOT EXISTS order_id uuid,
    ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT timezone('utc', now());

-- Ensure sensible defaults where the column already existed but null
UPDATE public.otp_verifications
   SET attempts = COALESCE(attempts, 0);

UPDATE public.otp_verifications
   SET max_attempts = COALESCE(max_attempts, 3);

UPDATE public.otp_verifications
   SET verified = COALESCE(verified, false);

UPDATE public.otp_verifications
   SET created_at = COALESCE(created_at, timezone('utc', now()))
 WHERE created_at IS NULL;
