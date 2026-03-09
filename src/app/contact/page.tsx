import { Suspense } from 'react';
import { Metadata } from 'next';

import ContactPage from '../../components/contact-page';
import { createPageMetadata } from '../../lib/metadata';

// Static metadata for better SEO and performance
export const metadata: Metadata = createPageMetadata({
  title: 'Contact TecBunny Solutions | Goa Tech & CCTV Support',
  description: 'Contact TecBunny Solutions for CCTV, computer hardware, AMC, and IT support in Goa. Call +91 96041 36010 or email support@tecbunny.com. Located in Pernem, North Goa.',
  keywords: ['contact TecBunny', 'CCTV support Goa', 'tech support Goa', 'TecBunny phone number', 'IT help Goa'],
  path: '/contact',
  image: '/brand.png',
});

// Force static generation
// export const dynamic = 'force-static';

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <ContactPage />
    </Suspense>
  );
}
