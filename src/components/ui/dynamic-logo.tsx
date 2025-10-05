'use client';

import * as React from 'react';

import { createClient } from '../../lib/supabase/client';

import { logger } from '../../lib/logger';

import { Logo as StaticLogo } from './logo';

interface DynamicLogoProps {
  className?: string;
  width?: number;
  height?: number;
  fallbackToStatic?: boolean;
}

export function DynamicLogo({ 
  className, 
  width = 40, 
  height = 40, 
  fallbackToStatic = true 
}: DynamicLogoProps) {
  const [logoUrl, setLogoUrl] = React.useState<string>('');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const supabase = createClient();

  React.useEffect(() => {
    async function fetchLogo() {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'logoUrl')
          .single();

        if (error) {
          logger.info('No custom logo found, using fallback', { context: 'DynamicLogo.fetchLogo' });
          setError(true);
        } else if (data?.value) {
          setLogoUrl(data.value);
        } else {
          setError(true);
        }
      } catch (err) {
        logger.error('Error fetching logo', { error: err, context: 'DynamicLogo.fetchLogo' });
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchLogo();
  }, [supabase]);

  // Show loading state
  if (loading) {
    return (
      <div 
        className={`bg-muted animate-pulse rounded ${className}`}
        style={{ width, height }}
      />
    );
  }

  // Show custom logo if available
  if (logoUrl && !error) {
    return (
      <img
        src={logoUrl}
        alt="TecBunny Logo"
        className={`object-contain ${className}`}
        width={width}
        height={height}
        onError={() => setError(true)}
      />
    );
  }

  // Fallback to static logo or nothing
  if (fallbackToStatic) {
    return (
      <StaticLogo 
        className={className || ''}
        width={width}
        height={height}
      />
    );
  }

  return null;
}
