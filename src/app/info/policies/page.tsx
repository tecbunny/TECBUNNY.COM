import Link from 'next/link';
import { ArrowLeft, FileText, Shield, Truck, RotateCcw } from 'lucide-react';

import { Metadata } from 'next';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';

// Static metadata for better SEO and performance
export const metadata: Metadata = {
  title: 'Policies - TecBunny Store',
  description: 'Read our privacy policy, terms of service, shipping information, and return policy.',
  keywords: ['policies', 'privacy', 'terms', 'shipping', 'returns', 'TecBunny'],
  openGraph: {
    title: 'Policies - TecBunny Store',
    description: 'Read our privacy policy, terms of service, shipping information, and return policy.',
    type: 'website',
  },
};

// Force static generation
export const dynamic = 'force-static';

export default function PoliciesPage() {
  const policies = [
    {
      title: 'Privacy Policy',
      description: 'Learn how we collect, use, and protect your personal information',
      icon: Shield,
      href: '/info/policies/privacy',
      color: 'text-blue-600',
    },
    {
      title: 'Terms of Service',
      description: 'Understand the terms and conditions of using our platform',
      icon: FileText,
      href: '/info/policies/terms',
      color: 'text-green-600',
    },
    {
      title: 'Shipping Policy',
      description: 'Information about shipping methods, costs, and delivery times',
      icon: Truck,
      href: '/info/policies/shipping',
      color: 'text-orange-600',
    },
    {
      title: 'Return Policy',
      description: 'Guidelines for returns, exchanges, and refunds',
      icon: RotateCcw,
      href: '/info/policies/return',
      color: 'text-red-600',
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/" 
            className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
          <h1 className="text-4xl font-bold mb-4">Policies & Legal Information</h1>
          <p className="text-lg text-muted-foreground">
            Review our policies to understand how we operate and protect your interests.
          </p>
        </div>

        {/* Policies Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {policies.map((policy) => {
            const IconComponent = policy.icon;
            return (
              <Link key={policy.href} href={policy.href}>
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg bg-gray-100 ${policy.color}`}>
                        <IconComponent className="h-6 w-6" />
                      </div>
                      <CardTitle className="text-xl">{policy.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {policy.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Contact Information */}
        <div className="mt-12 p-6 bg-gray-50 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">Need Help?</h2>
          <p className="text-muted-foreground mb-4">
            If you have questions about any of our policies, please don't hesitate to contact us.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link 
              href="/contact" 
              className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Contact Support
            </Link>
            <a 
              href="mailto:support@tecbunny.com" 
              className="inline-flex items-center justify-center px-6 py-3 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
            >
              Email Us
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}