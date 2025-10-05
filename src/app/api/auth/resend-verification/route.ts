import { NextRequest } from 'next/server';
import { createClient, type User } from '@supabase/supabase-js';

import { otpManager } from '../../../../lib/otp-manager';
import { rateLimit } from '../../../../lib/rate-limit';
import { apiError, apiSuccess } from '../../../../lib/errors';
import { logger } from '../../../../lib/logger';
import { sendSms } from '../../../../lib/sms/twofactor';

const LIMIT = 3; // 3 per 5 minutes
const WINDOW_MS = 5 * 60 * 1000;

export async function POST(request: NextRequest) {
  const correlationId = request.headers.get('x-correlation-id');
  try {
    const ct = request.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      return apiError('VALIDATION_ERROR', { overrideMessage: 'Content-Type must be application/json', correlationId });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return apiError('VALIDATION_ERROR', { overrideMessage: 'Invalid JSON body', correlationId });
    }
  const email = body?.email;
  const mobile = body?.mobile;
    if (typeof email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      if (!mobile || mobile.length < 10) {
        return apiError('VALIDATION_ERROR', { overrideMessage: 'Valid email address or mobile number is required', correlationId });
      }
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

    // CAPTCHA completely disabled for resend verification to ensure smooth user experience
    logger.debug('auth_resend_captcha_bypassed', { email, ip, correlationId, reason: 'CAPTCHA disabled for resend verification' });
    const key = `auth_resend:${email}|ip:${ip}`;
    if (!rateLimit(key, 'auth_resend_verification', { limit: LIMIT, windowMs: WINDOW_MS })) {
      logger.warn('auth_resend_rate_limited', { email, ip, correlationId });
      return apiError('RATE_LIMITED', { overrideMessage: 'Too many resend attempts. Please wait 5 minutes before trying again.', correlationId, details: { retryAfterMs: WINDOW_MS } });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: { users }, error: getUserError } = await supabase.auth.admin.listUsers();
    if (getUserError) {
      logger.error('auth_resend_list_users_failed', { error: getUserError.message, correlationId });
      return apiError('SERVICE_UNAVAILABLE', { correlationId });
    }

    const user = users.find((u: User) => 
      (email && u.email === email) || 
      (mobile && u.user_metadata?.mobile === mobile)
    );
    if (!user) {
      return apiError('NOT_FOUND', { overrideMessage: 'No account found with this email or mobile', correlationId });
    }
    if (user.email_confirmed_at) {
      return apiError('CONFLICT', { overrideMessage: 'Account is already verified', correlationId });
    }

    let result;
    if (mobile && !email) {
      // Send mobile OTP
      try {
        const smsResult = await sendSms({
          to: mobile,
          message: `Your TecBunny Store verification code is: {otp}`,
          vars: { otp: 'XXXXXX' },
          flowId: 'SIGNUP_OTP'
        });
        
        if (smsResult.success) {
          const otp = otpManager.generateOTP();
          const stored = await otpManager.storeOTP(mobile, otp, 'signup');
          if (stored) {
            result = { success: true, message: 'Verification code sent to mobile' };
        }
          }
        } catch (smsError) {
          logger.warn('auth_resend_sms_failed', { error: (smsError as Error).message, correlationId });
      }
    }
    
    // Fallback to email if mobile failed or email provided
    if (!result || !result.success) {
      if (email) {
        result = await otpManager.sendOTP(email, 'signup');
      } else {
        return apiError('SERVICE_UNAVAILABLE', { overrideMessage: 'Unable to send verification code', correlationId });
      }
    }
    if (!result.success) {
      logger.warn('auth_resend_otp_failed', { reason: result.message, correlationId });
      if (result.message?.includes('rate limit') || result.message?.includes('wait')) {
        return apiError('RATE_LIMITED', { overrideMessage: result.message, correlationId, details: { waitTime: result.waitTime } });
      }
      if (result.message?.includes('service') || result.message?.includes('unavailable')) {
        return apiError('SERVICE_UNAVAILABLE', { overrideMessage: 'Email service is temporarily unavailable. Please try again in a few minutes.', correlationId });
      }
      return apiError('INTERNAL_ERROR', { overrideMessage: result.message || 'Failed to send verification email', correlationId });
    }

    logger.info('auth_resend_success', { email, correlationId });
    return apiSuccess({ message: 'Verification email has been resent to your inbox.' }, correlationId);
  } catch (error) {
    logger.error('auth_resend_unhandled_error', { error: (error as Error).message, correlationId });
    return apiError('INTERNAL_ERROR', { overrideMessage: 'Failed to resend verification email', correlationId });
  }
}