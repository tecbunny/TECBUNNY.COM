'use client';

import Link from 'next/link';

import {
  Wrench,
  Shield,
  Truck,
  HeadphonesIcon,
  RefreshCw,
  Award,
  ArrowRight,
} from 'lucide-react';

import type { ComponentType } from 'react';

import type { LucideProps } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';

import type { Service } from '../lib/types';


const iconMap: Record<string, ComponentType<LucideProps>> = {
  Wrench,
  Shield,
  Truck,
  HeadphonesIcon,
  RefreshCw,
  Award,
};

export interface ServicesPageProps {
  services: Service[];
}

export default function ServicesPage({ services }: ServicesPageProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-primary mb-4">Our Services</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Comprehensive technology services designed to enhance your experience and keep your devices running smoothly.
        </p>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {services.map(service => {
          const Icon = iconMap[service.icon] || Wrench;
          return (
            <Card key={service.id} className="relative h-full hover:shadow-lg transition-shadow">
              {service.badge && (
                <Badge
                  variant={
                    service.badge === 'Popular'
                      ? 'default'
                      : service.badge === 'New'
                      ? 'secondary'
                      : 'outline'
                  }
                  className="absolute top-4 right-4"
                >
                  {service.badge}
                </Badge>
              )}
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{service.title}</CardTitle>
                </div>
                <CardDescription className="text-base">{service.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-4">
                  {service.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/contact">
                    Learn More <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* CTA Section */}
      <div className="bg-secondary/50 rounded-lg p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Need Custom Solutions?</h2>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Can't find what you're looking for? Our team can create custom solutions tailored to your specific needs.
        </p>
        <Button size="lg" asChild>
          <Link href="/contact">
            Contact Our Experts
          </Link>
        </Button>
      </div>
    </div>
  );
}