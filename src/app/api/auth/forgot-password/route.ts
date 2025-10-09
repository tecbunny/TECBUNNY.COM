import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import type { User } from '@supabase/supabase-js';

import { otpManager } from '../../../../lib/otp-manager';
import { verifyCaptcha } from '../../../../lib/captcha/captcha-service';
import { sendSms } from '../../../../lib/sms/twofactor';
import improvedEmailService from '../../../../lib/improved-email-service';
import { SuperfoneService } from '../../../../lib/superfone-service';
import { logger } from '../../../../lib/logger';

// Rate limiting storage (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function isRateLimited(email: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(email);
  
  if (!limit) {
    rateLimitMap.set(email, { count: 1, resetTime: now + 15 * 60 * 1000 }); // 15 minutes
    return false;
  }
  
  if (now > limit.resetTime) {
    rateLimitMap.set(email, { count: 1, resetTime: now + 15 * 60 * 1000 });
    return false;
  }
  
  if (limit.count >= 3) { // Max 3 attempts per 15 minutes
    return true;
  }
  
  limit.count++;
  return false;
}

export async function POST(request: NextRequest) {
  try {
  const { email, mobile, captchaToken } = await request.json();

    if (!email && !mobile) {
      return NextResponse.json(
        { error: 'Email or mobile number is required' },
        { status: 400 }
      );
    }

    const identifier = email || mobile;

    // Check rate limiting
    if (isRateLimited(identifier)) {
      return NextResponse.json(
        { error: 'Too many reset attempts. Please wait 15 minutes before trying again.' },
        { status: 429 }
      );
    }

    // CAPTCHA verification (only in production)
    if (process.env.NODE_ENV === 'production') {
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
      const captcha = await verifyCaptcha(captchaToken, ip);
      if (!captcha.success) {
        return NextResponse.json({ error: 'Captcha verification failed. Please retry.' }, { status: 400 });
      }
    } else {
      logger.debug('forgot_password.captcha_bypass', { identifier });
    }

    // Create admin client for user lookup
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Check if user exists via email or mobile
    if (email) {
      const { data: { users }, error: getUserError } = await supabase.auth.admin.listUsers();
      logger.info('forgot_password.lookup_start', { identifier, totalUsers: users?.length || 0 });
      if (getUserError) {
        logger.error('forgot_password.user_lookup_failed', { error: getUserError, identifier });
        return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 500 });
      }
      const authUser = users.find((u: User) => u.email === email);
      if (!authUser) {
        logger.warn('forgot_password.user_missing', { identifier });
        return NextResponse.json({ success: true, message: 'If an account with this email or mobile exists, you will receive an OTP code.' });
      }
    } else if (mobile) {
      // Lookup by mobile in profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id,email')
        .eq('mobile', mobile)
        .maybeSingle();
      if (profileError) {
        logger.error('forgot_password.profile_lookup_failed', { error: profileError, identifier });
        return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 500 });
      }
      if (!profile) {
        logger.warn('forgot_password.user_missing', { identifier });
        return NextResponse.json({ success: true, message: 'If an account with this email or mobile exists, you will receive an OTP code.' });
      }
      logger.info('forgot_password.profile_found', { identifier, userId: profile.id });
    }

  logger.info('forgot_password.sending_otp', { identifier, email, mobile });
  // Generate 4-digit OTP for recovery
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  logger.info('forgot_password.otp_generated', { identifier, otp: `${otp.substring(0, 2)}**` });
  
  // Store OTP
  const stored = await otpManager.storeOTP(identifier, otp, 'recovery');
  if (!stored) {
    logger.error('forgot_password.otp_store_failed', { identifier });
    return NextResponse.json({ error: 'Failed to store OTP' }, { status: 500 });
  }
  logger.info('forgot_password.otp_stored', { identifier });
  
  const message = `Your TecBunny Store password reset code is: ${otp}`;
  let successCount = 0;
  const errors: Array<{ channel: string; error: unknown }> = [];
  
  // Send via SMS
  if (mobile) {
    try {
      logger.info('forgot_password.attempting_sms', { mobile });
      const smsResult = await sendSms({ to: mobile, message });
      if (smsResult.success) {
        successCount++;
        logger.info('forgot_password.sms_sent', { mobile });
      } else {
        errors.push({ channel: 'SMS', error: smsResult.error });
        logger.warn('forgot_password.sms_failed', { mobile, error: smsResult.error });
      }
    } catch (e) {
      errors.push({ channel: 'SMS', error: e });
      logger.error('forgot_password.sms_exception', { mobile, error: e });
    }
  }
  
  // Send via WhatsApp using Superfone
  if (mobile) {
    try {
      logger.info('forgot_password.attempting_whatsapp', { mobile });
      const superfone = new SuperfoneService();
      const waResult = await superfone.sendWhatsApp({ recipient: mobile, message, type: 'text' });
      if (waResult.success) {
        successCount++;
        logger.info('forgot_password.whatsapp_sent', { mobile });
      } else {
        errors.push({ channel: 'WhatsApp', error: waResult.error });
        logger.warn('forgot_password.whatsapp_failed', { mobile, error: waResult.error });
      }
    } catch (e) {
      errors.push({ channel: 'WhatsApp', error: e });
      logger.error('forgot_password.whatsapp_exception', { mobile, error: e });
    }
  }
  
  // Send via email
  if (email) {
    try {
      logger.info('forgot_password.attempting_email', { email });
      const emailResult = await improvedEmailService.sendOTPEmail(email, otp, 'recovery');
      if (emailResult.success) {
        successCount++;
        logger.info('forgot_password.email_sent', { email });
      } else {
        errors.push({ channel: 'Email', error: emailResult.error });
        logger.warn('forgot_password.email_failed', { email, error: emailResult.error });
      }
    } catch (e) {
      errors.push({ channel: 'Email', error: e });
      logger.error('forgot_password.email_exception', { email, error: e });
    }
  }
  
  logger.info('forgot_password.send_complete', { identifier, successCount, errorCount: errors.length, errors });
  
  // Always return success details including errors for debugging
  const res = NextResponse.json({ 
    success: true, 
    message: `OTP sent successfully via ${successCount} channel(s)`,
    successCount,
    errors: errors.length > 0 ? errors : undefined
  });
    try {
      const payload = Buffer.from(JSON.stringify({ identifier, type: 'recovery', exp: Date.now() + 15 * 60 * 1000 }), 'utf8').toString('base64');
      res.cookies.set('recovery_otp', payload, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 15 * 60, // 15 minutes
        path: '/',
      });
    } catch {}
  logger.info('forgot_password.otp_sent', { identifier });
    return res;

  } catch (error) {
    logger.error('forgot_password.unhandled_error', { error });
    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500 }
    );
  }
}