'use client';

import { useState } from 'react';
import type { ComponentType } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import type { LucideProps } from 'lucide-react';
import {
  Award,
  HeadphonesIcon,
  RefreshCw,
  Shield,
  ShoppingCart,
  Truck,
  Wrench,
} from 'lucide-react';

import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { useCart } from '../lib/hooks';
import type { Product, Service } from '../lib/types';

import HeroCarousel from './HeroCarousel';


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
  const router = useRouter();
  const { addToCart } = useCart();
  const [busyServiceId, setBusyServiceId] = useState<string | null>(null);

  const buildServiceProduct = (service: Service): Product => {
    const title = service.title || 'TecBunny Service';
    const parsedPrice = typeof service.price === 'number'
      ? service.price
      : Number(service.price ?? 0);
    const price = Number.isFinite(parsedPrice) ? parsedPrice : 0;
    const product: Product = {
      id: `service-${service.id}`,
      title,
      name: title,
      description: service.description || 'TecBunny expert service request.',
      price,
      mrp: price,
      offer_price: price,
      discount_percentage: 0,
      category: service.category || 'Services',
      image: '/brand.png',
      images: ['/brand.png'],
      product_type: 'service',
      tags: ['service', service.category || 'Services'],
      status: 'active',
      brand: 'TecBunny Services',
      popularity: 0,
      rating: 0,
      reviewCount: 0,
      created_at: service.created_at || new Date().toISOString(),
      updated_at: service.updated_at || undefined,
      gstRate: price > 0 ? 18 : 0,
      product_url: '/services',
      additional_images: [],
    };

    return product;
  };

  const handleRaiseRequest = (service: Service) => {
    if (busyServiceId === service.id) return;
    setBusyServiceId(service.id);
    const product = buildServiceProduct(service);
    addToCart(product);
    router.push('/checkout?source=services');
  };

  return (
    <>
      <HeroCarousel pageKey="services" />
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
                <Button
                  variant="default"
                  className="w-full"
                  disabled={busyServiceId === service.id}
                  onClick={() => handleRaiseRequest(service)}
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Raise Request
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
    </>
  );
}