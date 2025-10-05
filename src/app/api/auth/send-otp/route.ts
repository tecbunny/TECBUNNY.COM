import { NextRequest } from 'next/server';

import { otpManager } from '../../../../lib/otp-manager';
import { logger } from '../../../../lib/logger';
import { apiError, apiSuccess } from '../../../../lib/errors';
import { verifyCaptcha } from '../../../../lib/captcha/captcha-service';
import { sendSms } from '../../../../lib/sms/twofactor';

export async function POST(request: NextRequest) {
  const correlationId = request.headers.get('x-correlation-id');
  try {
    let body: any;
    try { body = await request.json(); } catch { return apiError('VALIDATION_ERROR', { overrideMessage: 'Invalid JSON body', correlationId }); }
  const { email, mobile, type = 'signup', captchaToken } = body || {};

    logger.info('send_otp_start', { correlationId });

    // Validate that either email or mobile is provided
    if ((!email || !email.includes('@')) && (!mobile || mobile.length < 10)) {
      return apiError('VALIDATION_ERROR', { overrideMessage: 'Valid email address or mobile number is required', correlationId });
    }
    if (!['signup', 'recovery'].includes(type)) {
      return apiError('VALIDATION_ERROR', { overrideMessage: 'Invalid OTP type. Must be either "signup" or "recovery"', correlationId });
    }

    // CAPTCHA verification (if configured). Allow runtime bypass via header in non-production
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const bypassHeader = request.headers.get('x-bypass-captcha');
    const isBypassed = process.env.NODE_ENV !== 'production' && bypassHeader === '1';
    if (!isBypassed) {
      const captcha = await verifyCaptcha(captchaToken, ip);
      if (!captcha.success) {
        logger.warn('send_otp_captcha_failed', { correlationId, identifier: email || mobile, ip });
        return apiError('VALIDATION_ERROR', { overrideMessage: 'Captcha verification failed. Please retry.', correlationId });
      }
    } else {
      logger.debug('send_otp_captcha_bypassed', { correlationId, identifier: email || mobile, ip });
    }

    let result;
    
    if (mobile && !email) {
      // Mobile OTP request
      try {
        const smsResult = await sendSms({
          to: mobile,
          message: `Your TecBunny Store verification code is: {otp}`,
          vars: { otp: 'XXXXXX' },
          flowId: type === 'recovery' ? 'RESET_OTP' : 'SIGNUP_OTP'
        });
        
        if (smsResult.success) {
          const otp = otpManager.generateOTP();
          const stored = await otpManager.storeOTP(mobile, otp, type);
          if (stored) {
            result = { success: true, message: 'OTP sent to mobile', waitTime: 0 };
          }
        }
      } catch (smsError) {
        logger.warn('send_otp_sms_failed', { correlationId, error: (smsError as Error).message });
      }
    }
    
    // If mobile failed or email is provided, send email OTP
    if (!result || !result.success) {
      if (email) {
        result = await otpManager.sendOTP(email, type);
      } else {
        return apiError('SERVICE_UNAVAILABLE', { overrideMessage: 'Unable to send OTP. Please try again.', correlationId });
      }
    }
    
    if (result.success) {
      logger.info('send_otp_success', { correlationId });
      return apiSuccess({ message: result.message, waitTime: result.waitTime }, correlationId);
    } else {
      logger.warn('send_otp_failed', { correlationId, reason: result.message });
      return apiError('RATE_LIMITED', { overrideMessage: result.message, correlationId, details: { waitTime: result.waitTime } });
    }
  } catch (error) {
    logger.error('send_otp_unhandled', { correlationId, error: (error as Error).message });
    return apiError('INTERNAL_ERROR', { overrideMessage: 'Failed to send OTP', correlationId });
  }
}

// Ensure Node.js runtime for nodemailer and Supabase admin
export const runtime = 'nodejs';
export const maxDuration = 30;