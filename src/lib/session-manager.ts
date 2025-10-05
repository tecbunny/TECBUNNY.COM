'use client';

import { createClient } from '../lib/supabase/client';

import { logger } from './logger';

export class SessionManager {
  private static instance: SessionManager;
  private supabase = createClient();
  private refreshInterval: NodeJS.Timeout | null = null;

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  startSessionRefresh() {
    // Clear any existing interval
    this.stopSessionRefresh();
    
    // Refresh session every 30 minutes (tokens expire after 1 hour)
    this.refreshInterval = setInterval(async () => {
      try {
        const { data: { session }, error } = await this.supabase.auth.getSession();
        
        if (error) {
          logger.error('Session refresh error', { error });
          return;
        }
        
        if (session) {
          // Force a token refresh
          await this.supabase.auth.refreshSession();
          logger.debug('Session refreshed successfully');
        } else {
          logger.debug('No active session to refresh');
        }
      } catch (error) {
        logger.error('Session refresh failed', { error });
      }
    }, 30 * 60 * 1000); // 30 minutes
  }

  stopSessionRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  async checkSessionValidity(): Promise<boolean> {
    try {
      const { data: { session }, error } = await this.supabase.auth.getSession();
      
      if (error) {
        logger.error('Session check error', { error });
        return false;
      }
      
      return !!session;
    } catch (error) {
      logger.error('Session validity check failed', { error });
      return false;
    }
  }

  async forceRefreshSession() {
    try {
      const { data, error } = await this.supabase.auth.refreshSession();
      if (error) {
        logger.error('Force refresh error', { error });
        return false;
      }
      return !!data.session;
    } catch (error) {
      logger.error('Force refresh failed', { error });
      return false;
    }
  }
}

// Initialize session manager only on client side
if (typeof window !== 'undefined') {
  const sessionManager = SessionManager.getInstance();
  
  // Start session management when page loads
  window.addEventListener('load', () => {
    sessionManager.startSessionRefresh();
  });
  
  // Stop session refresh when page is hidden/unloaded
  window.addEventListener('beforeunload', () => {
    sessionManager.stopSessionRefresh();
  });
  
  // Handle page visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // Page became visible, check session validity
      sessionManager.checkSessionValidity();
    }
  });
}