import crypto from 'crypto';

import { createClient } from '@supabase/supabase-js';

import { logger } from './logger';

export interface SignupSession {
  id: string;
  email: string;
  name: string;
  mobile: string;
  created_at: string;
  expires_at: string;
}

class SignupSessionManager {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }

  // Create a signup session
  async createSession(email: string, password: string, name: string, mobile: string): Promise<{ success: boolean; sessionId?: string; message: string }> {
    try {
      // Hash the password for storage
      const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

      const { data, error } = await this.supabase
        .from('signup_sessions')
        .insert({
          email,
          password_hash: passwordHash,
          name,
          mobile,
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour
        })
        .select('id')
        .single();

      if (error) {
        logger.error('Error creating signup session', { error, email, name, mobile });
        return { success: false, message: 'Failed to create signup session' };
      }

      return { success: true, sessionId: data.id, message: 'Session created successfully' };
    } catch (error) {
      logger.error('Error in createSession', { error, email, name, mobile });
      return { success: false, message: 'An error occurred while creating session' };
    }
  }

  // Get a signup session by ID
  async getSession(sessionId: string): Promise<{ success: boolean; session?: SignupSession; password?: string; message: string }> {
    try {
      const { data, error } = await this.supabase
        .from('signup_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        return { success: false, message: 'Session not found or expired' };
      }

      // Return session data without the hash (we'll handle password separately)
      const session: SignupSession = {
        id: data.id,
        email: data.email,
        name: data.name,
        mobile: data.mobile,
        created_at: data.created_at,
        expires_at: data.expires_at
      };

      return { success: true, session, message: 'Session found' };
    } catch (error) {
      logger.error('Error in getSession', { error, sessionId });
      return { success: false, message: 'An error occurred while retrieving session' };
    }
  }

  // Get session by email (for OTP verification)
  async getSessionByEmail(email: string): Promise<{ success: boolean; session?: SignupSession; password?: string; message: string }> {
    try {
      const { data, error } = await this.supabase
        .from('signup_sessions')
        .select('*')
        .eq('email', email)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return { success: false, message: 'No active signup session found for this email' };
      }

      // Reconstruct password from hash (note: this is a simplified approach)
      // In a real app, you'd verify the password hash instead
      const session: SignupSession = {
        id: data.id,
        email: data.email,
        name: data.name,
        mobile: data.mobile,
        created_at: data.created_at,
        expires_at: data.expires_at
      };

      // For this implementation, we'll store the actual password temporarily
      // This is for the OTP verification flow
      return { success: true, session, password: data.password_hash, message: 'Session found' };
    } catch (error) {
      logger.error('Error in getSessionByEmail', { error, email });
      return { success: false, message: 'An error occurred while retrieving session' };
    }
  }

  // Mark session as used
  async markSessionUsed(sessionId: string): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await this.supabase
        .from('signup_sessions')
        .update({ used: true })
        .eq('id', sessionId);

      if (error) {
        logger.error('Error marking signup session as used', { error, sessionId });
        return { success: false, message: 'Failed to update session' };
      }

      return { success: true, message: 'Session marked as used' };
    } catch (error) {
      logger.error('Error in markSessionUsed', { error, sessionId });
      return { success: false, message: 'An error occurred while updating session' };
    }
  }

  // Clean up expired sessions
  async cleanupExpiredSessions(): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('signup_sessions')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (error) {
        logger.error('Error cleaning up expired signup sessions', { error });
      }
    } catch (error) {
      logger.error('Failed to cleanup expired sessions', { error });
    }
  }
}

export const signupSessionManager = new SignupSessionManager();
