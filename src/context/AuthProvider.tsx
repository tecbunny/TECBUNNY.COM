'use client';

import React, { createContext, useState, useEffect, useCallback } from 'react';

import type { SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';

import type { User, UserRole } from '../lib/types';
import { createClient } from '../lib/supabase/client';
import { logger } from '../lib/logger';

interface SignupDetails {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  captchaToken?: string;
}

interface AuthData {
  user?: SupabaseUser | User;
  session?: any;
  profile?: any;
  [key: string]: unknown;
}

interface AuthResponse {
  success: boolean;
  message: string;
  data?: AuthData;
  error?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  signup: (details: SignupDetails) => Promise<AuthResponse>;
  resendConfirmation: (email: string) => Promise<AuthResponse>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  updateUser: (updatedUser: User) => void;
  supabase: SupabaseClient;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchUserProfile = useCallback(async (supabaseUser: SupabaseUser) => {
    try {
      // Get role from app_metadata (secure, admin-only editable)
      const appMetadataRole = (supabaseUser.app_metadata?.role as UserRole) || null;
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile doesn't exist, create a basic one from user metadata
          logger.info('Profile not found, creating from user metadata', { userId: supabaseUser.id });
          const newProfile: User = {
            id: supabaseUser.id,
            name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User',
            email: supabaseUser.email || '',
            mobile: supabaseUser.user_metadata?.mobile || '',
            // Prefer app_metadata role (secure), fallback to user_metadata
            role: appMetadataRole || (supabaseUser.user_metadata?.role as UserRole) || 'customer'
          };
          
          // Try to insert the profile
          const { data: insertedProfile, error: insertError } = await supabase
            .from('profiles')
            .insert([{
              id: newProfile.id,
              name: newProfile.name,
              mobile: newProfile.mobile,
              role: newProfile.role
            }])
            .select()
            .single();
            
          if (insertError) {
            logger.error('Error creating profile', { error: insertError, userId: supabaseUser.id });
            return newProfile; // Return basic profile even if insert fails
          }
          
          return { ...insertedProfile, email: newProfile.email } as User;
        } else {
          logger.error('Error fetching profile', { error, userId: supabaseUser.id });
          return null;
        }
      }
      
      // Prefer app_metadata role (secure, admin-only editable) over profiles.role
      const userRole = appMetadataRole || (profile.role as UserRole) || 'customer';
      
      // Add email from auth user if not in profile
      return { 
        ...profile, 
        email: supabaseUser.email || profile.email || '',
        role: userRole
      } as User;
    } catch (err) {
      logger.error('Unexpected error in fetchUserProfile', { error: err, userId: supabaseUser?.id });
      return null;
    }
  }, [supabase]);

  useEffect(() => {
    let mounted = true;
    
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          logger.error('Session error', { error });
          if (mounted) {
            setUser(null);
            setLoading(false);
          }
          return;
        }
        
          if (session?.user && mounted) {
            const profile = await fetchUserProfile(session.user);
            // Merge email verification information from auth session
            const emailConfirmedAt = session.user.email_confirmed_at ?? null;
            if (profile) {
              setUser({ ...profile, emailVerified: Boolean(emailConfirmedAt || profile.email_confirmed_at), email_confirmed_at: emailConfirmedAt ?? profile.email_confirmed_at });
            } else {
              setUser(null);
            }
          } else if (mounted) {
            setUser(null);
          }
        
        if (mounted) {
          setLoading(false);
        }
      } catch (err) {
        logger.error('Session retrieval error', { error: err });
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    }
    
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      // Skip token refresh events to prevent unnecessary renders
      if (event === 'TOKEN_REFRESHED') {
        return;
      }
      
      if (event === 'SIGNED_IN' && session?.user) {
        const profile = await fetchUserProfile(session.user);
        if (mounted) {
          setUser(profile);
          setLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [supabase.auth, fetchUserProfile]);

  const login = async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        logger.error('Supabase login error', { error, email });
        
        if (error.message.includes('Email not confirmed')) {
          return {
            success: false,
            message: 'Please check your email and click the confirmation link before signing in.',
            error: 'Email not confirmed'
          };
        }
        
        return {
          success: false,
          message: error.message || 'Login failed',
          error: error.message || 'Login failed'
        };
      }
      
      if (!data || !data.session) {
        logger.error('Supabase login: No session returned', { data, email });
        return {
          success: false,
          message: 'No session returned from server',
          error: 'No session returned from Supabase'
        };
      }

      if (data.session.user) {
        const profile = await fetchUserProfile(data.session.user);
        setUser(profile);
        
        // Return success response with user profile for redirect logic
        return {
          success: true,
          message: 'Login successful',
          data: { user: data.user, session: data.session, profile }
        };
      }

      return {
        success: true,
        message: 'Login successful',
        data: { user: data.user, session: data.session }
      };
    } catch (error) {
      logger.error('Login error', { error, email });
      return {
        success: false,
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      };
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      
      // Call server-side signout API
      const response = await fetch('/api/auth/signout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Server signout failed');
      }
      
      // Also call client-side signout as backup
      const { error } = await supabase.auth.signOut();
      if (error) {
        logger.error('Client signout error', { error });
        // Don't throw here, server signout already succeeded
      }
      
      setUser(null);
      
      // Force redirect to homepage
      window.location.href = '/';
    } catch (error) {
      logger.error('Logout error', { error });
      // Fallback: still clear user state and redirect
      setUser(null);
      window.location.href = '/';
    } finally {
      setLoading(false);
    }
  };

  const signup = async (details: SignupDetails): Promise<AuthResponse> => {
    try {
      // runtime bypass via query param or env (only allowed in non-production)
      const runtimeBypass = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('disable_captcha') === '1';
      const captchaDisabled = process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DISABLE_CAPTCHA === 'true';
      const captchaBypassed = captchaDisabled || (process.env.NODE_ENV !== 'production' && runtimeBypass);

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (captchaBypassed) headers['x-bypass-captcha'] = '1';

      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: `${details.firstName} ${details.lastName}`,
          email: details.email,
          mobile: details.phone,
          password: details.password,
          role: 'customer',
          captchaToken: details.captchaToken
        }),
      });

      const data = await response.json();

      // If captcha failed but we are in non-production, retry once with bypass header set
      if (!response.ok) {
        const errMsg = data?.error || '';
        // detect captcha-related error
        const isCaptchaError = typeof errMsg === 'string' && errMsg.toLowerCase().includes('captcha');
        if (isCaptchaError && process.env.NODE_ENV !== 'production') {
          try {
            const retryHeaders: Record<string, string> = { 'Content-Type': 'application/json', 'x-bypass-captcha': '1' };
            const retryResp = await fetch('/api/auth/signup', {
              method: 'POST',
              headers: retryHeaders,
              body: JSON.stringify({
                name: `${details.firstName} ${details.lastName}`,
                email: details.email,
                mobile: details.phone,
                password: details.password,
                role: 'customer',
                captchaToken: details.captchaToken
              }),
            });
            const retryData = await retryResp.json();
            if (retryResp.ok) {
              return {
                success: true,
                message: 'Signup successful. Please check your email for verification.',
                data: { user: retryData.user }
              };
            }
            // fallthrough to return error with original message
          } catch (retryErr) {
            logger.warn('Signup retry with bypass failed', { error: retryErr, email: details.email });
          }
        }
        return {
          success: false,
          message: data.error || 'Signup failed',
          error: data.error || 'Signup failed'
        };
      }

      // Return data in the format expected by calling components
      return {
        success: true,
        message: 'Signup successful. Please check your email for verification.',
        data: { user: data.user }
      };
    } catch (error) {
      logger.error('Signup error', { error, email: details.email });
      return {
        success: false,
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      };
    }
  };

  const resendConfirmation = async (email: string, captchaToken?: string): Promise<AuthResponse> => {
    try {
      // Include mobile from local signup session when available to support SMS resend flows
      const stored = localStorage.getItem('signup_session');
      let storedMobile: string | undefined = undefined;
      if (stored) {
        try { storedMobile = JSON.parse(stored).mobile; } catch {}
      }

      // runtime bypass header support
      const runtimeBypass = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('disable_captcha') === '1';
      const captchaDisabled = process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DISABLE_CAPTCHA === 'true';
      const captchaBypassed = captchaDisabled || (process.env.NODE_ENV !== 'production' && runtimeBypass);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (captchaBypassed) headers['x-bypass-captcha'] = '1';

      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers,
        body: JSON.stringify({ email, mobile: storedMobile, captchaToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        // If captcha error and non-production, retry once with bypass header
        const errMsg = data?.error || '';
        const isCaptchaError = typeof errMsg === 'string' && errMsg.toLowerCase().includes('captcha');
        if (isCaptchaError && process.env.NODE_ENV !== 'production') {
          try {
            const retryHeaders: Record<string, string> = { 'Content-Type': 'application/json', 'x-bypass-captcha': '1' };
            const retryResp = await fetch('/api/auth/resend-verification', {
              method: 'POST',
              headers: retryHeaders,
              body: JSON.stringify({ email, mobile: storedMobile, captchaToken })
            });
            const retryData = await retryResp.json();
            if (retryResp.ok) {
              return {
                success: true,
                message: 'Verification email resent successfully',
                data: retryData
              };
            }
          } catch (retryErr) {
            logger.warn('Resend retry with bypass failed', { error: retryErr, email });
          }
        }
        return {
          success: false,
          message: data.error || 'Failed to resend verification email',
          error: data.error || 'Failed to resend verification email'
        };
      }

      return {
        success: true,
        message: 'Verification email resent successfully',
        data
      };
    } catch (error) {
      logger.error('Resend confirmation error', { error, email });
      return {
        success: false,
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      };
    }
  };

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      signup,
      resendConfirmation,
      setUser,
      updateUser,
      supabase
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};