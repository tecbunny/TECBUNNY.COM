import { randomBytes } from 'crypto';

import { createClient } from '@supabase/supabase-js';

import improvedEmailService from './improved-email-service';
import { logger } from './logger';

export interface OTPData {
  id: string;
  email: string;
  otp: string; // Changed from otp_code to otp
  expires_at: string;
  type: 'signup' | 'recovery';
  used: boolean;
  created_at: string;
}

interface OTPInsertData {
  email: string;
  otp?: string;
  otp_code?: string; 
  expires_at: string;
  type: 'signup' | 'recovery';
  used: boolean;
}

interface OTPSessionData {
  id?: string;
  identifier: string;
  otp_code: string;
  expires_at: string;
  type: string;
  used: boolean;
  session_id?: string;
  created_at?: string;
  updated_at?: string;
}

class OTPManager {
  private supabase: ReturnType<typeof createClient> | null;

  constructor() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) {
      this.supabase = createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
    } else {
      this.supabase = null;
      logger.warn('Supabase environment variables missing; using in-memory OTP storage fallback');
    }
  }

  // Generate a secure 4-digit OTP using crypto
  generateOTP(): string {
    // Use crypto for secure random number generation
    if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
      // Browser environment
      try {
        const array = new Uint32Array(1);
        window.crypto.getRandomValues(array);
        const value = array[0];
        if (value !== undefined) {
          return (1000 + (value % 9000)).toString();
        }
      } catch (error) {
        logger.warn('Browser crypto entropy failed; falling back to Node.js crypto', { error });
      }
    }
    
    if (typeof randomBytes !== 'undefined') {
      // Node.js environment
      try {
        const bytes = randomBytes(4);
        const num = bytes.readUInt32BE(0);
        return (1000 + (num % 9000)).toString();
      } catch (error) {
        logger.warn('Node crypto failed; falling back to Math.random', { error });
        return Math.floor(1000 + Math.random() * 9000).toString();
      }
    } else {
      // Fallback for environments without crypto
      return Math.floor(1000 + Math.random() * 9000).toString();
    }
  }

  // Store OTP in database with fallback to memory
  async storeOTP(email: string, otp: string, type: 'signup' | 'recovery' = 'signup'): Promise<boolean> {
    try {
      if (!this.supabase) {
        return this.storeOTPInMemory(email, otp, type);
      }
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minutes from now

      // First, try inserting into the new column name 'otp'
      const attemptInsert = async () => {
        const insertData: OTPInsertData = {
          email,
          otp, // preferred column name
          expires_at: expiresAt.toISOString(),
          type,
          used: false,
        };
        return (this.supabase as any).from('otp_codes').insert(insertData);
      };

      const { error } = await attemptInsert();

      if (!error) {
        logger.info('OTP stored in database', { strategy: 'primary' });
        return true;
      }

      // If table missing -> fallback to memory
      if (error?.code === '42P01') {
        logger.warn('OTP table not found; using memory storage fallback', { email, type });
        return this.storeOTPInMemory(email, otp, type);
      }

      // If column "otp" doesn't exist, retry with legacy column name 'otp_code'
      const columnMissing =
        typeof error?.message === 'string' &&
        (error.message.includes('column') || error.message.includes('column') || error.message.includes('otp'));

      if (columnMissing) {
        const legacyData: OTPInsertData = {
          email,
          otp_code: otp, // legacy column
          expires_at: expiresAt.toISOString(),
          type,
          used: false,
        };
        const { error: legacyError } = await (this.supabase as any)
          .from('otp_codes')
          .insert(legacyData);
        if (!legacyError) {
          logger.info('OTP stored in database', { strategy: 'legacy-column' });
          return true;
        }
        logger.error('Error storing OTP using legacy column', { error: legacyError });
        return this.storeOTPInMemory(email, otp, type);
      }

      // Any other DB error -> fallback to memory
      logger.error('Error storing OTP', { error, email, type });
      return this.storeOTPInMemory(email, otp, type);
    } catch (error) {
      logger.error('Failed to store OTP', { error, email, type });
      return this.storeOTPInMemory(email, otp, type);
    }
  }

  // In-memory OTP storage as fallback
  private otpStorage = new Map<string, {otp: string, type: string, expires: number, used: boolean}>();

  // In-memory mapping of 2factor.in session ids keyed by identifier (email or mobile)
  // When we use 2factor.in AUTOGEN, the provider returns a session id which we use to verify later
  private otpSessionStorage = new Map<string, { sessionId: string; expires: number }>();

  // Persist 2factor sessions in Supabase table `otp_sessions` when available.
  // Expected columns: id (uuid), identifier (text), session_id (text), expires_at (timestamptz), type (text)
  private async saveSession(identifier: string, sessionId: string, expiresAt: Date, type: string) {
    try {
      if (!this.supabase) return false;
      const { error } = await (this.supabase as any)
        .from('otp_sessions')
        .insert({ identifier, session_id: sessionId, expires_at: expiresAt.toISOString(), type });
      if (error) {
        // If the table doesn't exist or insertion fails, keep in-memory fallback
        logger.warn('Could not persist OTP session to database; using in-memory fallback', {
          identifier,
          sessionId,
          type,
          error,
        });
        return false;
      }
      return true;
    } catch (err) {
      logger.warn('Unexpected error saving OTP session to database; using in-memory fallback', {
        identifier,
        sessionId,
        type,
        error: err,
      });
      return false;
    }
  }

  private async getSessionFromDB(identifier: string): Promise<OTPSessionData | null> {
    try {
      if (!this.supabase) return null;
      const { data, error } = await this.supabase
        .from('otp_sessions')
        .select('*')
        .eq('identifier', identifier)
        .limit(1)
        .order('expires_at', { ascending: false })
        .maybeSingle<OTPSessionData>();
      if (error) {
        // Table may not exist
        return null;
      }
      return data || null;
    } catch (err) {
      logger.warn('Error fetching OTP session from database', { identifier, error: err });
      return null;
    }
  }

  private async deleteSessionFromDB(identifier: string): Promise<boolean> {
    try {
      if (!this.supabase) return false;
      const { error } = await this.supabase
        .from('otp_sessions')
        .delete()
        .eq('identifier', identifier);
      if (error) {
        logger.warn('Error deleting OTP session from database', { identifier, error });
        return false;
      }
      return true;
    } catch (err) {
      logger.warn('Unexpected error deleting OTP session from database', { identifier, error: err });
      return false;
    }
  }

  private storeOTPInMemory(email: string, otp: string, type: string): boolean {
    const key = `${email}:${type}`;
    this.otpStorage.set(key, {
      otp,
      type,
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      used: false
    });
  logger.info('OTP stored in memory', { email, type });
    return true;
  }

  // Send OTP email
  async sendOTP(email: string, type: 'signup' | 'recovery' = 'signup'): Promise<{ success: boolean; message: string; waitTime?: number }> {
    try {
      
      // Generate OTP
      const otp = this.generateOTP();

      // If a mobile number was passed instead of email and 2factor is configured, prefer 2factor.in
      const maybePhone = String(email || '').replace(/[\s+\-()]/g, '');
      const twoFactorKey = process.env.TWOFACTOR_API_KEY;
      const looksLikePhone = /^\d{8,15}$/.test(maybePhone);

      if (twoFactorKey && looksLikePhone) {
        // Use 2factor.in AUTOGEN to send an SMS OTP; store the returned session id for verification
        const twoResult = await this.sendVia2Factor(maybePhone);
        if (!twoResult.success) {
          return { success: false, message: twoResult.message };
        }
        // keep a short-lived session mapping (5 minutes) and attempt to persist in DB for serverless
        const expires = Date.now() + 5 * 60 * 1000;
        this.otpSessionStorage.set(maybePhone, { sessionId: twoResult.sessionId!, expires });
        // Try to persist in DB; if it fails we'll rely on in-memory map
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        await this.saveSession(maybePhone, twoResult.sessionId!, expiresAt, type).catch(() => null);

        // For phone/SMS flow we rely on provider session; do not attempt to send an email
        return { success: true, message: 'OTP sent via SMS', waitTime: undefined };
      } else {
        // Store in database as before for email/legacy fallback
        const stored = await this.storeOTP(email, otp, type);
        if (!stored) {
          return { success: false, message: 'Failed to store OTP in database' };
        }
      }
  // Send email
    const emailResult = await improvedEmailService.sendOTPEmail(email, otp, type);
      if (!emailResult.success) {
        return { 
          success: false, 
      message: emailResult.error || 'Failed to send OTP email',
          waitTime: emailResult.waitTime
        };
      }

      return { success: true, message: 'OTP sent successfully' };
    } catch (error) {
      logger.error('Error in OTP Manager sendOTP', { email, type, error });
      return {
        success: false,
        message: `An error occurred while sending OTP: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  // Verify OTP with database and memory fallback
  async verifyOTP(email: string, otp: string, type: 'signup' | 'recovery' = 'signup'): Promise<{ success: boolean; message: string }> {
    logger.debug('Starting OTP verification', { email, type });
    try {
      // If there is a 2factor.in session for this identifier (phone), use the provider to verify first
      const maybePhone = String(email || '').replace(/[\s+\-()]/g, '');
      logger.debug('Checking OTP sessions for identifier', { identifier: maybePhone });
      // Prefer persisted DB session (works in serverless); fall back to in-memory map
      const dbSession = await this.getSessionFromDB(maybePhone);
      if (dbSession) {
        const expiresAt = new Date(dbSession.expires_at).getTime();
        logger.debug('Found persisted OTP session', { identifier: maybePhone, expiresAt });
        if (Date.now() > expiresAt) {
          logger.debug('Persisted OTP session expired', { identifier: maybePhone });
          await this.deleteSessionFromDB(maybePhone).catch(() => null);
        } else {
          if (!dbSession.session_id) {
            logger.warn('Persisted OTP session missing session_id', { identifier: maybePhone });
            return { success: false, message: 'Invalid session' };
          }
          logger.debug('Verifying OTP via 2Factor using persisted session', {
            identifier: maybePhone,
            sessionId: dbSession.session_id,
          });
          const twoVerify = await this.verifyVia2Factor(dbSession.session_id, otp);
          if (twoVerify.success) {
            logger.info('2Factor verification succeeded via persisted session', { identifier: maybePhone });
            await this.deleteSessionFromDB(maybePhone).catch(() => null);
            this.otpSessionStorage.delete(maybePhone);
            return { success: true, message: 'OTP verified successfully' };
          }
          logger.warn('2Factor verification failed via persisted session', {
            identifier: maybePhone,
            message: twoVerify.message,
          });
          // fall through to in-memory/db fallback if provider verification fails
        }
      } else {
        logger.debug('No persisted OTP session found', { identifier: maybePhone });
      }

      const sessionEntry = this.otpSessionStorage.get(maybePhone);
      if (sessionEntry) {
        logger.debug('Found in-memory OTP session', { identifier: maybePhone });
        if (Date.now() > sessionEntry.expires) {
          logger.debug('In-memory OTP session expired', { identifier: maybePhone });
          this.otpSessionStorage.delete(maybePhone);
        } else {
          logger.debug('Verifying OTP via 2Factor using in-memory session', {
            identifier: maybePhone,
            sessionId: sessionEntry.sessionId,
          });
          const twoVerify = await this.verifyVia2Factor(sessionEntry.sessionId, otp);
          if (twoVerify.success) {
            logger.info('2Factor verification succeeded via in-memory session', { identifier: maybePhone });
            this.otpSessionStorage.delete(maybePhone);
            return { success: true, message: 'OTP verified successfully' };
          }
          logger.warn('2Factor verification failed via in-memory session', {
            identifier: maybePhone,
            message: twoVerify.message,
          });
        }
      } else {
        logger.debug('No in-memory OTP session found', { identifier: maybePhone });
      }

      // Try database first if configured
      let otpRecord: OTPData | null = null;
      let error: { code?: string; message?: string } | null = null;
      if (this.supabase) {
        logger.debug('Checking database for OTP record', { email, type });
        // Support both new ('otp') and legacy ('otp_code') column names
        const builder = (this.supabase as any)
          .from('otp_codes')
          .select('*')
          .eq('email', email)
          .eq('type', type)
          .eq('used', false)
          .gte('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1);

        // Use OR filter to match either column value
        // supabase-js: .or('otp.eq.123,otp_code.eq.123')
        const resp = await builder
          .or(`otp.eq.${otp},otp_code.eq.${otp}`)
          .single();
        otpRecord = resp.data;
        error = resp.error;

        logger.debug('Database OTP query result', { email, type, hasRecord: !!otpRecord, error });
      } else {
        logger.warn('No Supabase connection available for OTP verification', { email, type });
      }

      if (error && error.code === '42P01') {
        // Table doesn't exist, check memory storage
        logger.warn('OTP table missing; falling back to memory verification', { email, type });
        return this.verifyOTPFromMemory(email, otp, type);
      } else if (error || !otpRecord) {
        // Check memory storage as fallback
        logger.debug('Database OTP not found; falling back to memory', { email, type, error });
        const memoryResult = this.verifyOTPFromMemory(email, otp, type);
        if (memoryResult.success) {
          return memoryResult;
        }
        logger.debug('Memory OTP verification failed', { email, type });
        return { success: false, message: 'Invalid or expired OTP' };
      }

      // Mark OTP as used in database
      if (!this.supabase) {
        // Shouldn't happen because otpRecord exists only when supabase was queried
        return { success: false, message: 'Failed to verify OTP' };
      }
      const { error: updateError } = await (this.supabase as any)
        .from('otp_codes')
        .update({ used: true } as any)
        .eq('id', otpRecord.id);

      if (updateError) {
        logger.error('Error marking OTP as used', { email, type, otpId: otpRecord.id, error: updateError });
        return { success: false, message: 'Failed to verify OTP' };
      }

      return { success: true, message: 'OTP verified successfully' };
    } catch (error) {
      logger.error('Error verifying OTP', { email, type, error });
      // Try memory storage as final fallback
      return this.verifyOTPFromMemory(email, otp, type);
    }
  }

  private verifyOTPFromMemory(email: string, otp: string, type: string): { success: boolean; message: string } {
    const key = `${email}:${type}`;
    logger.debug('Checking memory storage for OTP', {
      key,
      storedKeys: this.otpStorage.size,
    });
    
    const stored = this.otpStorage.get(key);
    
    if (!stored) {
      logger.debug('No OTP found in memory for key', { key });
      return { success: false, message: 'Invalid or expired OTP' };
    }
    
    if (stored.used) {
      logger.warn('OTP already used in memory', { key });
      return { success: false, message: 'OTP has already been used' };
    }
    
    if (Date.now() > stored.expires) {
      logger.warn('OTP expired in memory', { key });
      this.otpStorage.delete(key);
      return { success: false, message: 'OTP has expired' };
    }
    
    if (stored.otp !== otp) {
      logger.warn('OTP mismatch in memory', { key });
      return { success: false, message: 'Invalid OTP' };
    }
    
    // Mark as used
    stored.used = true;
    logger.info('OTP verified from memory', { email, type });
    
    return { success: true, message: 'OTP verified successfully' };
  }

  // Clean up expired OTPs (optional, can be run periodically)
  async cleanupExpiredOTPs(): Promise<void> {
    try {
      if (!this.supabase) return;
      const { error } = await this.supabase
        .from('otp_codes')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (error) {
        logger.error('Error cleaning up expired OTPs', { error });
      }
    } catch (error) {
      logger.error('Failed to cleanup expired OTPs', { error });
    }
  }

  // Resend OTP (with rate limiting)
  async resendOTP(email: string, type: 'signup' | 'recovery' = 'signup'): Promise<{ success: boolean; message: string }> {
    try {
      // Check if there's a recent OTP (within last 2 minutes)
      const twoMinutesAgo = new Date();
      twoMinutesAgo.setMinutes(twoMinutesAgo.getMinutes() - 2);

      if (this.supabase) {
        const { data: recentOTP, error } = await this.supabase
          .from('otp_codes')
          .select('created_at')
          .eq('email', email)
          .eq('type', type)
          .gte('created_at', twoMinutesAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (recentOTP && !error) {
          return { success: false, message: 'Please wait 2 minutes before requesting another OTP' };
        }
      }

      // Send new OTP
      return this.sendOTP(email, type);
    } catch (error) {
      logger.error('Error resending OTP', { email, type, error });
      return { success: false, message: 'An error occurred while resending OTP' };
    }
  }

  // 2factor.in integration helpers
  private async sendVia2Factor(mobile: string): Promise<{ success: boolean; message: string; sessionId?: string }> {
    try {
      const apiKey = process.env.TWOFACTOR_API_KEY;
      if (!apiKey) return { success: false, message: '2factor API key not configured' };
      // 2factor AUTOGEN endpoint: https://2factor.in/API/V1/{API_KEY}/SMS/AUTOGEN/{MOBILE}/AUTOGEN
      const url = `https://2factor.in/API/V1/${encodeURIComponent(apiKey)}/SMS/AUTOGEN/${encodeURIComponent(mobile)}/AUTOGEN`;
      const res = await fetch(url, { method: 'GET' });
      const json = await res.json();
      if (!res.ok || json.Status !== 'Success') {
        return { success: false, message: json.Details || json.description || 'Failed to send SMS via 2factor' };
      }
      // json.Details contains session id
      return { success: true, message: 'OTP sent via SMS', sessionId: json.Details };
    } catch (err: unknown) {
      logger.error('2factor send error', { mobile, error: err });
      return { success: false, message: err instanceof Error ? err.message : '2factor send failed' };
    }
  }

  private async verifyVia2Factor(sessionId: string, otp: string): Promise<{ success: boolean; message?: string }> {
    try {
      const apiKey = process.env.TWOFACTOR_API_KEY;
      if (!apiKey) return { success: false, message: '2factor API key not configured' };
      const url = `https://2factor.in/API/V1/${encodeURIComponent(apiKey)}/SMS/VERIFY/${encodeURIComponent(sessionId)}/${encodeURIComponent(otp)}`;
      const res = await fetch(url, { method: 'GET' });
      const json = await res.json();
      if (!res.ok || json.Status !== 'Success') {
        return { success: false, message: json.Details || json.description || 'OTP verification failed' };
      }
      return { success: true };
    } catch (err: unknown) {
      logger.error('2factor verify error', { sessionId, error: err });
      return { success: false, message: err instanceof Error ? err.message : '2factor verify failed' };
    }
  }
}

export const otpManager = new OTPManager();
export default otpManager;
