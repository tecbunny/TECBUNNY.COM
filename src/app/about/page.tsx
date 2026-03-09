import { Metadata } from 'next';

import AboutPage from '../../components/about-page';
import { createPageMetadata } from '../../lib/metadata';

// Static metadata for better SEO and performance
export const metadata: Metadata = createPageMetadata({
  title: 'About TecBunny Solutions | CCTV & IT Services Company in Goa',
  description: 'TecBunny Solutions is a registered IT & security services company in Goa. We supply CCTV systems, computer hardware, networking solutions, and provide AMC services across North Goa.',
  keywords: ['TecBunny Solutions Goa', 'IT company Goa', 'CCTV company Goa', 'tech services Pernem', 'about TecBunny'],
  path: '/about',
  image: '/brand.png',
});

// Optimized for static generation
export default function Page() {
  return <AboutPage />;
}
