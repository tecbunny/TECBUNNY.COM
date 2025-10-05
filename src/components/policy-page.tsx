"use client";

import * as React from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import sanitizeHtml from '../lib/sanitize-html';
import { usePageContent } from '../hooks/use-page-content';

import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

interface PolicyPageProps {
  pageKey: string;
  defaultTitle?: string;
}

export default function PolicyPage({ pageKey, defaultTitle = 'Policy' }: PolicyPageProps) {
  const { content, loading, error } = usePageContent(pageKey);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        {/* Show basic page structure while loading */}
        <div className="max-w-4xl mx-auto">
          <Button asChild variant="ghost" className="mb-6">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl font-bold">
                {defaultTitle}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p>Loading {defaultTitle.toLowerCase()}...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <Button asChild variant="ghost" className="mb-6">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl font-bold">
                {defaultTitle}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                {error ? `Error: ${error}` : 'Content temporarily unavailable. Please refresh the page.'}
              </p>
              <Button asChild>
                <Link href="/">
                  Back to Home
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const policyData = content.content || {};

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Button asChild variant="outline">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl text-primary">
              {policyData.title || defaultTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-muted-foreground">
            {policyData.lastUpdated && (
              <p>Last updated: {policyData.lastUpdated}</p>
            )}
            
            {policyData.introduction && (
              <div className="space-y-4">
                {policyData.introduction.map((paragraph: string, index: number) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            )}

            {policyData.sections && policyData.sections.map((section: any, index: number) => (
              <div key={index} className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground pt-4">
                  {section.title}
                </h2>
                {section.content && section.content.map((paragraph: string, pIndex: number) => (
                  <p key={pIndex}>{paragraph}</p>
                ))}
                {section.list && (
                  <ul className="list-disc pl-6 space-y-2">
                    {section.list.map((item: string, lIndex: number) => (
                      <li key={lIndex} dangerouslySetInnerHTML={{ __html: sanitizeHtml(item) }} />
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
