import type { Metadata } from 'next';
import AIResearchClient from './AIResearchClient';
import { createPageMetadata } from '../../lib/metadata';

export const metadata: Metadata = createPageMetadata({
  title: 'AI Product Research Assistant | TecBunny Solutions Goa',
  description: "Use TecBunny's AI Research Assistant to find the best CCTV cameras, computers, and IT hardware for your needs. Powered by Gemini AI.",
  keywords: ['AI product research', 'CCTV research tool', 'tech advisor Goa', 'TecBunny AI', 'best CCTV camera finder'],
  path: '/ai-research',
  image: '/brand.png',
});

export default function AiResearchPage() {
  return <AIResearchClient />;
}
