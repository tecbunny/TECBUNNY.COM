'use client';

import { useState } from 'react';
import type { ComponentType } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import type { LucideProps } from 'lucide-react';
import {
  Award,
  Cctv,
  Cpu,
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
  Cctv,
  Cpu,
};

interface ServicePricingTier {
  label: string;
  price: string;
  detail: string;
  amount?: number;
}

interface ServicePricingPlan {
  name: string;
  summary: string;
  tiers: ServicePricingTier[];
}

interface ServicePricingCategory {
  category: string;
  blurb: string;
  plans: ServicePricingPlan[];
}

interface TermSubSection {
  title: string;
  description?: string;
  bullets: string[];
}

interface AmcTerm {
  title: string;
  description?: string;
  bullets?: string[];
  sections?: TermSubSection[];
}

const servicePricing: ServicePricingCategory[] = [
  {
    category: 'CCTV Services',
    blurb: 'Structured deployments and proactive maintenance for surveillance infrastructure.',
    plans: [
      {
        name: 'New Installation',
        summary: 'Complete survey, cabling, DVR/NVR configuration, and remote viewing setup.',
        tiers: [
          { label: 'Up to 4 Cameras', price: '₹1,499', detail: 'Includes on-site survey, cabling up to 80m, and DVR pairing for smaller sites.', amount: 1499 },
          { label: 'Up to 8 Cameras', price: '₹2,499', detail: 'Balanced setup for villas or retail floors with DVR/NVR tuning.', amount: 2499 },
          { label: 'More than 8 Cameras', price: '₹3,999', detail: 'Large deployments with advanced routing and monitoring dashboards.', amount: 3999 }
        ]
      },
      {
        name: 'Repair Services',
        summary: 'Flat-fee diagnostics plus minor fixes for existing CCTV setups.',
        tiers: [
          { label: 'Standard Repair', price: '₹999', detail: 'Includes visit, feed diagnostics, and quick component swaps (parts extra).', amount: 999 }
        ]
      },
      {
        name: 'AMC Services',
        summary: 'Annual maintenance programs with monthly coverage payments billed upfront.',
        tiers: [
          { label: 'Home AMC', price: '₹999 / month (billed annually)', detail: 'Covers up to 1 PC and 1 CCTV setup; invoiced ₹11,988 yearly.', amount: 999 * 12 },
          { label: 'Business AMC 1', price: '₹1,999 / month (billed annually)', detail: 'Covers up to 3 PCs and 1 CCTV (up to 8CH); invoiced ₹23,988 yearly.', amount: 1999 * 12 },
          { label: 'Business AMC 2', price: '₹2,999 / month (billed annually)', detail: 'Covers up to 5 PCs and 1 CCTV (up to 8CH); invoiced ₹35,988 yearly.', amount: 2999 * 12 },
          { label: 'Enterprise AMC 1', price: '₹3,999 / month (billed annually)', detail: 'Covers up to 5 PCs and 1 CCTV (up to 16CH); invoiced ₹47,988 yearly.', amount: 3999 * 12 },
          { label: 'Enterprise AMC 2', price: '₹4,999 / month (billed annually)', detail: 'Covers up to 5 PCs and 1 CCTV (up to 32CH); invoiced ₹59,988 yearly.', amount: 4999 * 12 }
        ]
      }
    ]
  },
  {
    category: 'Computer Services',
    blurb: 'From bespoke workstation builds to fast repair and upgrade programs.',
    plans: [
      {
        name: 'New Customised Setup',
        summary: 'Requirement capture, component sourcing, assembly, and burn-in testing.',
        tiers: [
          { label: 'Custom Build Request', price: '₹1,999', detail: 'Covers consulting plus configuration blueprint (hardware billed separately).', amount: 1999 }
        ]
      },
      {
        name: 'Repair Services',
        summary: 'Rapid fault isolation plus genuine spares for laptops and desktops.',
        tiers: [
          { label: 'Standard Repair', price: '₹999', detail: 'Includes diagnostics, OS tune-up, and labor (parts extra).', amount: 999 }
        ]
      },
      {
        name: 'Upgrade Services',
        summary: 'Extend hardware life with certified performance upgrades.',
        tiers: [
          { label: 'Upgrade Service Ticket', price: '₹999', detail: 'Covers labor for RAM, SSD, or GPU swaps (parts extra).', amount: 999 }
        ]
      }
    ]
  }
];

const companyInfo = {
  name: 'TECBUNNY SOLUTIONS PRIVATE LIMITED',
  cin: 'U80200GA2025PTC017488',
  udyam: 'UDYAM-GA-01-0047280',
  gstin: '30AAMCT1608G1ZO',
  ceo: 'SHUBHAM SAKHARAM BHISAJI',
  website: 'https://www.tecbunny.com'
};

const amcTerms: AmcTerm[] = [
  {
    title: 'Scope of Service & Inclusions',
    description: 'Limited comprehensive coverage for the specific CCTV and PC equipment documented in each contract annexure.',
    bullets: [
      'Preventive Maintenance visits for cleaning, diagnostics, and health checks.',
      'Unlimited breakdown support with labor and travel charges included.',
      'PC software assistance for OS corruption, malware removal, and third-party installation issues.',
      'Limited parts replacement benefit up to the value/claim caps defined in the selected plan.',
      'Applies only to the cameras, DVR/NVR, SMPS, and PCs listed in the annexure.'
    ]
  },
  {
    title: 'Prerequisites for Contract Initiation',
    bullets: [
      'All equipment must be documented and in fully working condition on the activation date.',
      'Non-working items must be repaired at standard rates before activation or remain excluded for the contract term.'
    ]
  },
  {
    title: 'Financial and Replacement Terms',
    bullets: [
      'Limited Parts Coverage (LPC) is capped by both a value limit and claim count per plan.',
      'After the limit is reached, labor stays free but replacement parts are billed to the customer.',
      'Hard disk replacements are excluded from LPC; only labor is covered for HDD swaps.'
    ]
  },
  {
    title: 'Exclusions (Not Covered)',
    bullets: [
      'Physical damage from misuse, tampering, fire, flood, lightning, or pest infestation.',
      'Electrical faults caused by voltage fluctuations, surges, or improper earthing.',
      'Any data loss for CCTV footage or PC data; backups remain the customer’s responsibility.',
      'Repairs performed by unauthorized personnel void coverage for the affected item.',
      'Consumables such as batteries, extensive cabling, or media beyond normal wear.',
      'External works including relocation, civil modifications, or specialized access equipment.'
    ]
  },
  {
    title: 'Service Level Agreement (SLA) & Termination',
    sections: [
      {
        title: 'Response Time',
        bullets: [
          'Home AMC calls receive on-site response within 48 business hours.',
          'Business and Enterprise AMC calls receive on-site response within 24 business hours.'
        ]
      },
      {
        title: 'Contract Duration & Termination',
        bullets: [
          'Contracts run for 12 non-transferable months.',
          'Either party may terminate with a 30-day written notice.',
          'No refunds are issued for the unexpired period.'
        ]
      },
      {
        title: 'Financial Settlement',
        bullets: [
          'If LPC benefits were used before termination, the parts value is deducted from any settlement.',
          'Final settlement, if applicable, is processed within 30 days of the official termination date.'
        ]
      }
    ]
  }
];

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

  const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

  const handleRaiseRequest = (service: Service) => {
    if (busyServiceId === service.id) return;
    setBusyServiceId(service.id);
    const product = buildServiceProduct(service);
    addToCart(product);
    router.push('/checkout?source=services');
  };

  const handlePricingTierAdd = (category: string, plan: ServicePricingPlan, tier: ServicePricingTier) => {
    if (!tier.amount) return;
    const syntheticId = `pricing-${slugify(category)}-${slugify(plan.name)}-${slugify(tier.label)}`;
    if (busyServiceId === syntheticId) return;
    setBusyServiceId(syntheticId);

    const nowIso = new Date().toISOString();
    const syntheticService: Service = {
      id: syntheticId,
      icon: category.includes('CCTV') ? 'Cctv' : 'Cpu',
      title: `${plan.name} – ${tier.label}`,
      description: `${plan.summary} ${tier.detail}`.trim(),
      features: [plan.summary, tier.detail],
      badge: null,
      is_active: true,
      price: tier.amount,
      duration_days: undefined,
      category: (category.includes('CCTV') ? 'CCTV' : 'Computer') as Service['category'],
      display_order: 0,
      created_at: nowIso,
      updated_at: nowIso,
    };

    const product = buildServiceProduct(syntheticService);
    product.title = syntheticService.title;
    product.price = tier.amount;
    product.offer_price = tier.amount;

    addToCart(product);
    router.push('/checkout?source=services');
    setBusyServiceId(null);
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

      {/* Pricing Section */}
      <div className="mb-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-foreground">Transparent Service Pricing</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Indicative pricing tiers keep budgeting simple. Final estimates include on-site assessment, travel, and any consumables.
          </p>
        </div>
        <div className="space-y-8">
          {servicePricing.map(category => (
            <Card key={category.category} className="shadow-sm border-primary/10">
              <CardHeader>
                <CardTitle className="text-2xl">{category.category}</CardTitle>
                <CardDescription>{category.blurb}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {category.plans.map(plan => (
                  <div key={plan.name} className="rounded-2xl border border-primary/10 bg-muted/10 p-5">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
                      <div>
                        <h3 className="text-xl font-semibold text-foreground">{plan.name}</h3>
                        <p className="text-sm text-muted-foreground max-w-2xl">{plan.summary}</p>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      {plan.tiers.map(tier => {
                        const tierId = `pricing-${slugify(category.category)}-${slugify(plan.name)}-${slugify(tier.label)}`;
                        const hasPrice = Boolean(tier.amount);
                        return (
                        <div key={tier.label} className="rounded-xl border border-dashed border-primary/30 bg-background p-4 flex flex-col">
                          <p className="text-xs font-semibold uppercase tracking-wide text-primary">{tier.label}</p>
                          <p className="text-2xl font-bold text-foreground mt-2">{tier.price}</p>
                          <p className="text-sm text-muted-foreground mt-2 flex-1">{tier.detail}</p>
                          <Button
                            variant={hasPrice ? 'default' : 'outline'}
                            size="sm"
                            className="mt-4 w-full"
                            disabled={!hasPrice || busyServiceId === tierId}
                            onClick={() => handlePricingTierAdd(category.category, plan, tier)}
                          >
                            {hasPrice ? 'Add to Cart' : 'Request Quote'}
                          </Button>
                        </div>
                      );
                      })}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-6">*All prices are indicative. Taxes, hardware, and travel charges (if applicable) are shared on the final quotation.</p>
      </div>

      {/* AMC Terms */}
      <Card className="mb-12 border-primary/20 shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Annual Maintenance Contract (AMC) Terms</CardTitle>
          <CardDescription>
            General terms and conditions applicable to all CCTV and PC AMC plans offered by TecBunny.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Company</p>
              <p className="font-semibold text-foreground">{companyInfo.name}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">CIN</p>
              <p>{companyInfo.cin}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Udyam</p>
              <p>{companyInfo.udyam}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">GSTIN</p>
              <p>{companyInfo.gstin}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">CEO</p>
              <p>{companyInfo.ceo}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Website</p>
              <a href={companyInfo.website} target="_blank" rel="noreferrer" className="text-primary underline">
                {companyInfo.website.replace('https://', '')}
              </a>
            </div>
          </div>
          <div className="space-y-5">
            {amcTerms.map(term => (
              <div key={term.title} className="rounded-2xl border border-dashed border-primary/20 bg-muted/30 p-5">
                <h3 className="text-lg font-semibold text-foreground">{term.title}</h3>
                {term.description && (
                  <p className="text-sm text-muted-foreground mt-1">{term.description}</p>
                )}
                {term.bullets && (
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                    {term.bullets.map((bullet, index) => (
                      <li key={index}>{bullet}</li>
                    ))}
                  </ul>
                )}
                {term.sections && (
                  <div className="mt-4 space-y-4">
                    {term.sections.map(section => (
                      <div key={section.title}>
                        <p className="text-sm font-semibold text-foreground">{section.title}</p>
                        {section.description && (
                          <p className="text-sm text-muted-foreground">{section.description}</p>
                        )}
                        <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                          {section.bullets.map((bullet, index) => (
                            <li key={index}>{bullet}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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