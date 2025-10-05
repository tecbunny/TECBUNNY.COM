import { Metadata } from 'next';

import ServicesPage from '../../components/services-page';
import { logger } from '../../lib/logger';
import { createServiceClient } from '../../lib/supabase/server';

// Static metadata for better SEO and performance
export const metadata: Metadata = {
  title: 'Services - TecBunny Store',
  description: 'Explore our comprehensive range of technology services including repairs, consultations, and custom solutions.',
  keywords: ['services', 'tech repair', 'consultation', 'TecBunny', 'technology solutions'],
  openGraph: {
    title: 'Services - TecBunny Store',
    description: 'Explore our comprehensive range of technology services including repairs, consultations, and custom solutions.',
    type: 'website',
  },
};

// Force static generation
export const dynamic = 'force-static';

export default async function Page() {
  let services = [];
  
  try {
    // Check if we're in a build environment where database might not be available
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      // Silent fallback during build - no warning needed for static generation
      return <ServicesPage services={[]} />;
    }

    // Use service client on the server to avoid RLS recursion issues
    const supabase = createServiceClient();
    
    // Fetch all available columns without assuming schema; avoid ORDER BY to prevent missing-column errors
    const { data, error } = await supabase
      .from('services')
      .select('*');

    if (error) {
      logger.error('Error fetching services', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      // Instead of throwing an error during build, return empty services
      return <ServicesPage services={[]} />;
    }

    services = (data || []).map((s: any) => {
    const statusVal = s.status;
    const isActive = typeof s.is_active === 'boolean'
      ? s.is_active
      : (typeof statusVal === 'boolean'
          ? statusVal
          : String(statusVal || '').toLowerCase() === 'active');
    const title = s.title || s.name || 'Service';
    const description = s.description || s.details || '';
    const rawFeatures = s.features || s.feature_list || [];
    const features = Array.isArray(rawFeatures)
      ? rawFeatures
      : (typeof rawFeatures === 'string'
          ? (() => { try { const parsed = JSON.parse(rawFeatures); return Array.isArray(parsed) ? parsed : []; } catch { return []; } })()
          : []);
    return {
      ...s,
      title,
      description,
      icon: s.icon || s.icon_name || null,
      features,
      badge: (s.badge as any) ?? null,
      is_active: isActive ?? true,
      category: s.category || 'Support',
      display_order: typeof s.display_order === 'number' ? s.display_order : 0,
    };
  });

  // Prefer server-side order when column exists; otherwise do a stable client-side sort by title
  services.sort((a: any, b: any) => {
    const ao = typeof a.display_order === 'number' ? a.display_order : null;
    const bo = typeof b.display_order === 'number' ? b.display_order : null;
    if (ao !== null && bo !== null) return ao - bo;
    if (ao !== null) return -1;
    if (bo !== null) return 1;
    return String(a.title).localeCompare(String(b.title));
  });
  
  } catch (error) {
    logger.error('Error in services page', { error });
    // Return empty services on error to prevent build failure
    services = [];
  }
  
  return <ServicesPage services={services} />;
}