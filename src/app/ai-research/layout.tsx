import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Research Assistant | TecBunny Solutions',
  description: 'Run AI-assisted research and get product recommendations tailored to your requirements.',
  keywords: ['AI research', 'product recommendations', 'TecBunny', 'solutions', 'technology'],
  openGraph: {
    title: 'AI Research Assistant | TecBunny Solutions',
    description: 'Run AI-assisted research and get product recommendations tailored to your requirements.',
    type: 'website',
  },
};

export default function AiResearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
