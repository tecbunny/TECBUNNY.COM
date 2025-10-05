import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import type { User } from '@supabase/supabase-js';

import { otpManager } from '../../../../lib/otp-manager';
import { logger } from '../../../../lib/logger';

// Rate limiting storage (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function isRateLimited(identifier: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(identifier);
  
  if (!limit) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + 5 * 60 * 1000 }); // 5 minutes
    return false;
  }
  
  if (now > limit.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + 5 * 60 * 1000 });
    return false;
  }
  
  if (limit.count >= 5) { // Max 5 attempts per 5 minutes
    return true;
  }
  
  limit.count++;
  return false;
}

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters long';
  if (!/(?=.*[a-z])/.test(password)) return 'Password must contain at least one lowercase letter';
  if (!/(?=.*[A-Z])/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/(?=.*\d)/.test(password)) return 'Password must contain at least one number';
  if (!/(?=.*[@$!%*?&])/.test(password)) return 'Password must contain at least one special character';
  return null;
}

export async function POST(request: NextRequest) {
  try {
  const body = await request.json();
  const otp = (body?.otp || body?.code || '').toString().trim();
  const email = (body?.email || body?.userEmail || '').toString().trim();
  const mobile = (body?.mobile || '').toString().trim();
  // Accept multiple client keys and normalize
  const password: string = (body?.password || body?.newPassword || body?.new_password || '').toString();

    if (!otp || (!email && !mobile) || !password) {
      return NextResponse.json(
        { error: 'OTP, email or mobile, and password are required' },
        { status: 400 }
      );
    }

    // Check rate limiting
    const identifier = email || mobile;
    if (isRateLimited(identifier)) {
      return NextResponse.json(
        { error: 'Too many reset attempts. Please wait 5 minutes before trying again.' },
        { status: 429 }
      );
    }

  // Validate password strength
  const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json(
        { error: passwordError },
        { status: 400 }
      );
    }

    // Verify OTP via DB/memory
    let verify = await otpManager.verifyOTP(identifier, otp, 'recovery');
    // As a fallback (dev/local), accept cookie-stored OTP if present and valid
    if (!verify.success) {
      const c = request.cookies.get('recovery_otp')?.value;
      if (c) {
        try {
          const json = JSON.parse(Buffer.from(c, 'base64').toString('utf8')) as { identifier: string; otp: string; type: string; exp: number };
          if (json.identifier === identifier && json.type === 'recovery' && json.otp === otp && Date.now() < json.exp) {
            verify = { success: true, message: 'OTP verified via cookie fallback' } as const;
          }
        } catch {}
      }
    }
    if (!verify.success) {
      return NextResponse.json(
        { error: verify.message || 'Invalid or expired OTP' },
        { status: 400 }
      );
    }

    // Create admin client for password update
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

    // Get user by email or mobile
    const { data: { users }, error: getUserError } = await supabase.auth.admin.listUsers();
    
    if (getUserError) {
      logger.error('auth.reset_password.get_user_failed', { error: getUserError, identifier });
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = users.find((u: User) => u.email === email || (u.user_metadata?.mobile === mobile));
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update user password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password }
    );

    if (updateError) {
      logger.error('auth.reset_password.update_failed', { error: updateError, userId: user.id });
      return NextResponse.json(
        { error: 'Failed to update password' },
        { status: 500 }
      );
    }

    // Mark OTP as used (cleanup) - already done in verifyOTP above
    // await otpManager.verifyOTP(email, otp, 'recovery');

    if (process.env.NODE_ENV !== 'production') {
      logger.info('auth.reset_password.success', { identifier });
    }

    const res = NextResponse.json({
      success: true,
      message: 'Password has been reset successfully'
    });
    try {
      res.cookies.set('recovery_otp', '', { maxAge: 0, path: '/' });
    } catch {}
    return res;

  } catch (error) {
    logger.error('auth.reset_password.unhandled_error', { error });
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
}