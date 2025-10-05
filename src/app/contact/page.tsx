import { Metadata } from 'next';

import ContactPage from '../../components/contact-page';

// Static metadata for better SEO and performance
export const metadata: Metadata = {
  title: 'Contact Us - TecBunny Store',
  description: 'Get in touch with TecBunny Store. We\'re here to help with your technology needs and questions.',
  keywords: ['contact', 'support', 'help', 'TecBunny', 'customer service'],
  openGraph: {
    title: 'Contact Us - TecBunny Store',
    description: 'Get in touch with TecBunny Store. We\'re here to help with your technology needs and questions.',
    type: 'website',
  },
};

// Force static generation
export const dynamic = 'force-static';

export default function Page() {
  return <ContactPage />;
}