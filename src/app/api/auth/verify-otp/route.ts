import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { otpManager } from '../../../../lib/otp-manager';
import { dualChannelOTPManager } from '../../../../lib/dual-channel-otp-manager';
import { logger } from '../../../../lib/logger';
import { apiError, apiSuccess } from '../../../../lib/errors';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-role-placeholder';
const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);

function getSupabaseAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export async function POST(request: NextRequest) {
  const correlationId = request.headers.get('x-correlation-id');
  try {
    if (!isSupabaseConfigured) {
      logger.error('verify_otp.supabase_config_missing', { correlationId });
      return apiError('SERVER_ERROR', {
        overrideMessage: 'Supabase configuration missing. Please contact support.',
        correlationId
      });
    }

    const supabaseAdmin = getSupabaseAdmin();
    let body: any; try { body = await request.json(); } catch { return apiError('VALIDATION_ERROR', { overrideMessage: 'Invalid JSON body', correlationId }); }
  const { email, mobile, otp, type = 'signup' } = body || {};

  // Debug: log incoming body in development for easier tracing
  if (process.env.NODE_ENV !== 'production') {
    logger.debug('verify_otp_incoming', { correlationId, body });
  }
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown';

    // Validate that either email or mobile is provided
    if ((!email || !email.includes('@')) && (!mobile || mobile.length < 10)) {
      return apiError('VALIDATION_ERROR', { overrideMessage: 'Valid email address or mobile number is required', correlationId });
    }
    if (typeof otp !== 'string' || otp.length !== 4 || !/^\d{4}$/.test(otp)) {
      return apiError('VALIDATION_ERROR', { overrideMessage: 'Valid 4-digit OTP is required', correlationId });
    }
    if (!['signup', 'recovery'].includes(type)) {
      return apiError('VALIDATION_ERROR', { overrideMessage: 'Invalid OTP type. Must be either "signup" or "recovery"', correlationId });
    }

    // Ad-hoc rate limiting based on recent attempts (kept as-is but with logging)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  // Prefer mobile if provided (SMS flows rely on phone session ids)
  // But for signup OTPs, they are typically sent to email, so prefer email for signup type
  const identifier = type === 'signup' ? (email || mobile) : (mobile || email);

  // Debug: log which identifier we will use
  logger.debug('verify_otp_identifier', { correlationId, identifier, type, email, mobile });
    try {
      const { data: recentAttempts, error: attemptError } = await supabaseAdmin
        .from('otp_codes')
        .select('id')
        .eq('email', identifier)
        .eq('type', type)
        .gte('created_at', fiveMinutesAgo);
      if (!attemptError && recentAttempts && recentAttempts.length > 5) {
        logger.warn('verify_otp_rate_limited', { correlationId, identifier, clientIP, attempts: recentAttempts.length });
        return apiError('RATE_LIMITED', { overrideMessage: 'Too many verification attempts. Please wait 5 minutes before trying again.', correlationId });
      }
    } catch (rateLimitError) {
      logger.warn('verify_otp_rate_check_failed', { correlationId, error: (rateLimitError as Error).message });
    }

    // CAPTCHA completely disabled for OTP verification to ensure smooth user experience
    logger.debug('verify_otp_captcha_bypassed', { correlationId, identifier, clientIP, reason: 'OTP verification does not require CAPTCHA' });

    // Debug log the OTP verification attempt
    logger.debug('verify_otp_attempt', { correlationId, identifier, otp, type });

    // Try dual-channel verification first (new system)
    let result: any;
    try {
      const dualChannelResult = await dualChannelOTPManager.verifyOTP(identifier, otp, type);
      if (dualChannelResult.valid) {
        result = { success: true, message: 'OTP verified successfully' };
        logger.info('verify_otp_dual_channel_success', { correlationId, identifier, type });
      } else {
        // Fallback to legacy verification
        result = await otpManager.verifyOTP(identifier, otp, type);
        logger.debug('verify_otp_fallback_to_legacy', { correlationId, identifier, result });
      }
    } catch (dualChannelError) {
      logger.warn('verify_otp_dual_channel_error', { 
        correlationId, 
        error: dualChannelError instanceof Error ? dualChannelError.message : 'Unknown error' 
      });
      // Fallback to legacy verification
      result = await otpManager.verifyOTP(identifier, otp, type);
    }
    
    logger.debug('verify_otp_result', { correlationId, identifier, success: result.success, message: result.message });
    
    if (!result.success) {
      logger.warn('verify_otp_failed', { correlationId, reason: result.message });
      return apiError('VALIDATION_ERROR', { overrideMessage: result.message, correlationId });
    }

    logger.info('verify_otp_success', { correlationId, type, identifier });

    if (type === 'signup') {
      // For signup, just return success - account creation will be handled by complete-signup endpoint
      return apiSuccess({
        message: 'OTP verified successfully! Creating your account...',
        type: 'signup',
        identifier,
        requiresAccountCreation: true
      }, correlationId);
    }
    
    // For recovery type, find and confirm existing user
    if (type === 'recovery') {
      try {
        const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers();
        const user = allUsers.users.find(u => 
          (email && u.email === email) || 
          (mobile && u.user_metadata?.mobile === mobile)
        );
        
        if (user) {
          const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(user.id, { email_confirm: true });
          if (confirmError) {
            logger.error('verify_otp_confirm_failed', { correlationId, error: confirmError.message });
            return apiError('SERVER_ERROR', { overrideMessage: 'Failed to confirm account. Please try again.', correlationId });
          } else {
            logger.info('verify_otp_recovery_success', { correlationId, identifier });
            return apiSuccess({
              message: 'Account verified successfully!',
              type,
              identifier,
              requiresSignIn: false
            }, correlationId);
          }
        } else {
          logger.error('verify_otp_user_not_found', { correlationId, identifier });
          return apiError('VALIDATION_ERROR', { overrideMessage: 'User not found. Please sign up first.', correlationId });
        }
      } catch (e) {
        logger.error('verify_otp_recovery_exception', { correlationId, error: (e as Error).message });
        return apiError('SERVER_ERROR', { overrideMessage: 'Failed to verify account. Please try again.', correlationId });
      }
    }

    // Default success response
    return apiSuccess({
      message: result.message || 'Verification successful',
      type,
      identifier,
      requiresSignIn: type === 'signup'
    }, correlationId);

  } catch (error) {
    logger.error('verify_otp_exception', { correlationId, error: (error as Error).message });
    return apiError('SERVER_ERROR', { overrideMessage: 'Internal server error during verification', correlationId });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 30;