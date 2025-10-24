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
      className="relative py-14 sm:py-20 text-white bg-cover bg-center"
      style={{ backgroundImage: `url(${heroData.image})` } as React.CSSProperties}
    >
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl rounded-xl bg-black/60 p-6 sm:p-10 text-center backdrop-blur">
          <h1 className="mb-4 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
            {heroData.title}
          </h1>
          <p className="mb-6 text-base sm:text-lg lg:text-xl opacity-90">
            {heroData.subtitle}
          </p>
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
            {heroData.buttons?.map((btn: any, idx: number) => (
              <Link
                key={idx}
                href={btn.link}
                className={`inline-flex items-center justify-center rounded-md px-5 py-2.5 text-sm font-medium transition-colors sm:text-base ${
                  btn.type === 'primary'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-gray-600 hover:bg-gray-700'
                }`}
              >
                {btn.text}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}