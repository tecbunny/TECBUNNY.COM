import type { MetadataRoute } from 'next';
import { createServiceClient, isSupabaseServiceConfigured } from '../lib/supabase/server';

const baseUrl = 'https://www.tecbunny.com';

const staticRoutes = [
  { url: `${baseUrl}/`,                  changeFrequency: 'weekly'  as const, priority: 1.0 },
  { url: `${baseUrl}/products`,          changeFrequency: 'daily'   as const, priority: 0.9 },
  { url: `${baseUrl}/services`,          changeFrequency: 'monthly' as const, priority: 0.8 },
  { url: `${baseUrl}/offers`,            changeFrequency: 'weekly'  as const, priority: 0.8 },
  { url: `${baseUrl}/webdev`,            changeFrequency: 'monthly' as const, priority: 0.8 },
  { url: `${baseUrl}/about`,             changeFrequency: 'monthly' as const, priority: 0.7 },
  { url: `${baseUrl}/contact`,           changeFrequency: 'monthly' as const, priority: 0.7 },
  { url: `${baseUrl}/customised-setups`, changeFrequency: 'monthly' as const, priority: 0.7 },
  { url: `${baseUrl}/innovation`,        changeFrequency: 'monthly' as const, priority: 0.6 },
  { url: `${baseUrl}/ai-research`,       changeFrequency: 'monthly' as const, priority: 0.6 },
  { url: `${baseUrl}/info/policies`,           changeFrequency: 'yearly' as const, priority: 0.3 },
  { url: `${baseUrl}/info/policies/privacy`,   changeFrequency: 'yearly' as const, priority: 0.3 },
  { url: `${baseUrl}/info/policies/return`,    changeFrequency: 'yearly' as const, priority: 0.3 },
  { url: `${baseUrl}/info/policies/shipping`,  changeFrequency: 'yearly' as const, priority: 0.3 },
  { url: `${baseUrl}/info/policies/terms`,     changeFrequency: 'yearly' as const, priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const routes: MetadataRoute.Sitemap = staticRoutes.map(r => ({ ...r, lastModified: now }));

  if (!isSupabaseServiceConfigured) return routes;

  try {
    const supabase = createServiceClient();
    const { data: products } = await supabase
      .from('products')
      .select('id, updated_at')
      .order('updated_at', { ascending: false })
      .limit(5000);

    if (products && products.length > 0) {
      const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
        url: `${baseUrl}/products/${p.id}`,
        lastModified: p.updated_at ? new Date(p.updated_at) : now,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
      return [...routes, ...productRoutes];
    }
  } catch {
    // Fall back to static routes on error
  }

  return routes;
}
