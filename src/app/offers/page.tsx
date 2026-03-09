import { Metadata } from 'next';

import OffersPage from '../../components/offers-page';

// Static metadata for better SEO and performance
export const metadata: Metadata = {
  title: 'Special Offers & Deals on CCTV & Tech in Goa | TecBunny Solutions',
  description: 'Shop exclusive deals on CCTV cameras, NVR/DVR systems, computers, and networking gear from TecBunny Solutions in Goa. Limited-time offers updated weekly.',
  keywords: ['CCTV deals Goa', 'tech offers Goa', 'NVR discounts', 'computer deals Goa', 'TecBunny offers'],
  alternates: { canonical: 'https://www.tecbunny.com/offers' },
  openGraph: {
    title: 'Special Offers & Deals on CCTV & Tech in Goa | TecBunny Solutions',
    description: 'Shop exclusive deals on CCTV cameras, NVR/DVR systems, computers, and networking gear from TecBunny Solutions in Goa.',
    type: 'website',
    siteName: 'TecBunny Solutions',
    url: 'https://www.tecbunny.com/offers',
    images: [{ url: 'https://www.tecbunny.com/brand.png', width: 1200, height: 630, alt: 'TecBunny Solutions Offers' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Special Offers & Deals | TecBunny Solutions Goa',
    description: 'Shop exclusive deals on CCTV cameras, NVR/DVR systems, computers, and networking gear.',
    images: ['https://www.tecbunny.com/brand.png'],
  },
};

// Force static generation
// export const dynamic = 'force-static';

export default function Page() {
  return <OffersPage />;
}
