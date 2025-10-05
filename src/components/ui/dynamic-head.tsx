'use client';

import * as React from 'react';

import { createClient } from '../../lib/supabase/client';

import { logger } from '../../lib/logger';

export function DynamicFavicon() {
  const supabase = createClient();

  React.useEffect(() => {
    async function updateFavicon() {
      try {
        // Get favicon URL from settings
        const { data, error } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'faviconUrl')
          .single();

        // Manage a single dynamic favicon element to avoid removeChild() issues
        const ensureFavicon = (href: string, type: string) => {
          if (!document.head) return;
          const id = 'dynamic-favicon';
          let link = document.head.querySelector(`link#${id}`) as HTMLLinkElement | null;
          if (!link) {
            link = document.createElement('link');
            link.id = id;
            link.rel = 'icon';
            document.head.appendChild(link);
          }
          link.type = type;
          link.href = href;
          logger.info('Favicon set', { href, context: 'DynamicFavicon.updateFavicon' });
        };

        if (!error && data?.value) {
          ensureFavicon(data.value, 'image/x-icon');
        } else {
          ensureFavicon('/brand.png', 'image/png');
        }
      } catch (error) {
        logger.error('Error updating favicon', { error, context: 'DynamicFavicon.updateFavicon' });
      }
    }

    // Only run on client side after component mount
    if (typeof window !== 'undefined') {
      updateFavicon();
    }

    // Note: Real-time updates disabled to prevent WebSocket authentication issues
    // If you need real-time favicon updates, ensure proper Supabase Realtime configuration
    
  }, [supabase]);

  return null; // This component doesn't render anything
}

export function DynamicTitle() {
  const supabase = createClient();

  React.useEffect(() => {
    async function updateTitle() {
      try {
        // Get site name from settings
        const { data, error } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'siteName')
          .single();

        if (!error && data?.value && typeof window !== 'undefined') {
          document.title = data.value;
          logger.info('Title updated', { title: data.value, context: 'DynamicTitle.updateTitle' });
        }
      } catch (error) {
        logger.error('Error updating title', { error, context: 'DynamicTitle.updateTitle' });
      }
    }

    // Only run on client side after component mount
    if (typeof window !== 'undefined') {
      updateTitle();
    }

    // Note: Real-time updates disabled to prevent WebSocket authentication issues
    // If you need real-time title updates, ensure proper Supabase Realtime configuration
    
  }, [supabase]);

  return null; // This component doesn't render anything
}
