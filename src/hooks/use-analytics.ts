'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

export const useAnalytics = () => {
  const pathname = usePathname();
  const sessionId = useRef<string>('');

  useEffect(() => {
    // Initialize session ID
    let storedSession = sessionStorage.getItem('analytics_session_id');
    if (!storedSession) {
      storedSession = uuidv4();
      sessionStorage.setItem('analytics_session_id', storedSession);
    }
    sessionId.current = storedSession;
  }, []);

  const trackEvent = async (eventType: string, data?: any) => {
    try {
      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType,
          pageUrl: window.location.href,
          sessionId: sessionId.current,
          ...data
        })
      });
    } catch (error) {
      console.error('Failed to track event', error);
    }
  };

  // Auto-track page views
  useEffect(() => {
    trackEvent('page_view');
  }, [pathname]);

  return { trackEvent };
};
