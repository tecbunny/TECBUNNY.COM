'use client';

import { useEffect } from 'react';

import { logger } from './logger';

// Performance monitoring utility
export function usePerformanceMonitoring() {
  useEffect(() => {
    // Only run in development
    if (process.env.NODE_ENV !== 'development') return;

    // Monitor bundle size
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'navigation') {
          logger.debug('Page load time recorded', { durationMs: entry.duration });
        }
        if (entry.entryType === 'resource' && entry.name.includes('chunk')) {
          const resourceEntry = entry as PerformanceResourceTiming;
          logger.debug('Chunk size observed', {
            resource: entry.name,
            transferSize: resourceEntry.transferSize,
          });
        }
      });
    });

    observer.observe({ entryTypes: ['navigation', 'resource'] });

    return () => observer.disconnect();
  }, []);
}

// Bundle size reporter
export function reportBundleSize() {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    const scripts = document.querySelectorAll('script[src]');
    let totalSize = 0;
    
    scripts.forEach((script) => {
      const src = script.getAttribute('src');
      if (src?.includes('_next/static/chunks/')) {
        // This is a rough estimate - actual size would need server-side calculation
        totalSize += 1;
      }
    });
    
  logger.debug('Estimated bundle chunks', { totalSize });
  }
}

// Performance tips
export const performanceTips = {
  lazyLoading: 'Use React.lazy() for components that are not immediately needed',
  imageOptimization: 'Use Next.js Image component for automatic optimization',
  codesplitting: 'Split routes and components into separate chunks',
  treeShaking: 'Import only what you need from libraries',
  bundleAnalysis: 'Run npm run build to see bundle sizes',
};
