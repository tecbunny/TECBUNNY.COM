// Timezone Cache - Avoid expensive pg_timezone_names queries
// This prevents 600ms+ queries by caching timezone data

import { createClient } from '@supabase/supabase-js'

// Cache for 24 hours
const CACHE_DURATION = 24 * 60 * 60 * 1000
let timezoneCache: string[] | null = null
let cacheTimestamp: number = 0

/**
 * Get list of valid timezones
 * Uses in-memory cache to avoid expensive database queries
 */
export async function getTimezones(): Promise<string[]> {
  const now = Date.now()
  
  // Return cached data if still valid
  if (timezoneCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return timezoneCache
  }

  try {
    // Fetch from database (this query takes ~600ms)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    const { data, error } = await supabase.rpc('get_timezones')
    
    if (error) throw error
    
    // Update cache
    const timezones = data || []
    timezoneCache = timezones
    cacheTimestamp = now
    
    return timezones
  } catch (error) {
    console.error('Failed to fetch timezones:', error)
    
    // Fallback to common timezones if database query fails
    const fallbackTimezones = getCommonTimezones()
    timezoneCache = fallbackTimezones
    cacheTimestamp = now
    return fallbackTimezones
  }
}

/**
 * Common timezones fallback (avoids database query entirely)
 */
export function getCommonTimezones(): string[] {
  return [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Toronto',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Dubai',
    'Asia/Kolkata', // India
    'Asia/Shanghai',
    'Asia/Tokyo',
    'Australia/Sydney',
    'Pacific/Auckland',
  ]
}

/**
 * Clear timezone cache (useful for testing)
 */
export function clearTimezoneCache(): void {
  timezoneCache = null
  cacheTimestamp = 0
}
