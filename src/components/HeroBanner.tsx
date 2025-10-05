'use client';

import React from 'react';
import Link from 'next/link';

import { usePageContent } from '../hooks/use-page-content';

export default function HeroBanner() {
  const { content: homepageContent } = usePageContent('homepage');
  const heroData = homepageContent?.content?.hero;
  if (!heroData) return null;

  return (
    <section
      className="relative py-20 text-white bg-cover bg-center"
      style={{ backgroundImage: `url(${heroData.image})` } as React.CSSProperties}
    >
      <div className="container mx-auto px-4 text-center bg-black bg-opacity-50 p-8 rounded">
        <h1 className="text-5xl font-bold mb-4">{heroData.title}</h1>
        <p className="text-xl mb-4">{heroData.subtitle}</p>
        {heroData.buttons?.map((btn: any, idx: number) => (
          <Link key={idx} href={btn.link} passHref>
            <a
              className={`inline-block px-6 py-3 m-2 rounded text-white ${
                btn.type === 'primary' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 hover:bg-gray-700'
              }`}
            >
              {btn.text}
            </a>
          </Link>
        ))}
      </div>
    </section>
  );
}