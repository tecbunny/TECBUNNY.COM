import { Metadata } from 'next';

import AboutPage from '../../components/about-page';

// Static metadata for better SEO and performance
export const metadata: Metadata = {
  title: 'About Us - TecBunny Store',
  description: 'Learn about TecBunny Store, our mission, values, and the team behind your favorite technology destination.',
  keywords: ['about', 'team', 'mission', 'values', 'TecBunny', 'company'],
  openGraph: {
    title: 'About Us - TecBunny Store',
    description: 'Learn about TecBunny Store, our mission, values, and the team behind your favorite technology destination.',
    type: 'website',
  },
};

// Keep this page dynamic since it contains team section
// The team section should remain dynamic as requested
export const dynamic = 'force-dynamic';

export default function Page() {
  return <AboutPage />;
}