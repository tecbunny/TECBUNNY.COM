// Central helper to resolve canonical site URL(s).
// Supports comma-separated values in NEXT_PUBLIC_SITE_URL (e.g., "https://tecbunny.com,https://tecbunny.store").

export function getDefaultSiteUrls(): string[] {
  const env = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || '';
  if (!env) return ['https://tecbunny.com'];
  return env.split(',').map(s => s.trim()).filter(Boolean);
}

// Prefer the origin matching a host when provided, else return the first configured URL
export function resolveSiteUrl(host?: string): string {
  const urls = getDefaultSiteUrls();
  if (host) {
    const hostOnly = host.replace(/https?:\/\//, '').split(':')[0];
    if (hostOnly) {
      const match = urls.find(u => u.includes(hostOnly));
      if (match) return match;
    }
  }
  return urls[0] || 'http://localhost:9003';
}
