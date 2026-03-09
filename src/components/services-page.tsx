'use client';

import { useState } from 'react';
import type { ComponentType } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import type { LucideProps } from 'lucide-react';
import {
  Award,
  Cctv,
  CheckCircle2,
  Code,
  Cpu,
  Globe,
  HeadphonesIcon,
  Home,
  KeyRound,
  RefreshCw,
  Shield,
  ShoppingCart,
  Truck,
  Wrench,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useCart } from '../lib/hooks';
import { usePermissions } from '../hooks/use-permissions';
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
  Code,
  Home,
  KeyRound,
  Globe,
};

const coreServices = [
  {
    icon: Cctv,
    title: 'CCTV',
    subtitle: 'Surveillance & Security',
    color: 'from-cyan-500 to-blue-600',
    border: 'border-cyan-500/20',
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-300',
    description:
      'HD indoor & outdoor camera installation with 24/7 remote monitoring, motion alerts, and cloud backup across Goa.',
    features: ['HD camera setup', 'Remote mobile access', 'Motion detection alerts', 'AMC support available'],
    cta: '/request?service=cctv',
    ctaLabel: 'Get CCTV Quote',
  },
  {
    icon: Home,
    title: 'Home Automation',
    subtitle: 'Smart Home Control',
    color: 'from-violet-500 to-purple-600',
    border: 'border-violet-500/20',
    bg: 'bg-violet-500/10',
    text: 'text-violet-300',
    description:
      'Control lights, fans, ACs, and appliances from your phone or voice assistant. Intelligent automation for comfort and energy savings.',
    features: ['App & voice control', 'Energy-saving schedules', 'Smart switches & sensors', 'Professional installation'],
    cta: '/request?service=home-automation',
    ctaLabel: 'Request Setup',
  },
  {
    icon: Cpu,
    title: 'IT Services',
    subtitle: 'Complete Tech Support',
    color: 'from-emerald-500 to-teal-600',
    border: 'border-emerald-500/20',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-300',
    description:
      'End-to-end IT support including network setup, server configuration, hardware repair, upgrades, and Annual Maintenance Contracts.',
    features: ['Network & server setup', 'Hardware repair & upgrades', 'Computer sales & builds', 'AMC plans available'],
    cta: '/request?service=it-services',
    ctaLabel: 'Raise IT Ticket',
  },
  {
    icon: KeyRound,
    title: 'RFID Locks & Cards',
    subtitle: 'Designed RFID Solutions',
    color: 'from-orange-500 to-amber-600',
    border: 'border-orange-500/20',
    bg: 'bg-orange-500/10',
    text: 'text-orange-300',
    description:
      'Smart RFID door locks paired with fully custom-designed branded RFID cards. Keyless access control for homes, offices, and hotels.',
    features: ['Smart RFID door locks', 'Custom branded RFID cards', 'Multi-user access control', 'Audit trail logging'],
    cta: '/request?service=rfid-locks',
    ctaLabel: 'Get RFID Quote',
  },
  {
    icon: Globe,
    title: 'Web Development',
    subtitle: 'Modern Websites & Apps',
    color: 'from-pink-500 to-rose-600',
    border: 'border-pink-500/20',
    bg: 'bg-pink-500/10',
    text: 'text-pink-300',
    description:
      'Responsive, SEO-ready websites and web applications built for performance. From business portfolios to full e-commerce platforms.',
    features: ['Responsive design', 'E-commerce & portals', 'SEO-ready deployment', 'Ongoing maintenance'],
    cta: '/request?service=web-development',
    ctaLabel: 'Start Your Project',
  },
];

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
    category: 'Computer Services',
    blurb: 'From bespoke workstation builds to fast repair and upgrade programs.',
    plans: [
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

export default function ServicesPage({ services: _services }: ServicesPageProps) {
  const router = useRouter();
  const { addToCart } = useCart();
  const { atLeast } = usePermissions();
  const [busyServiceId, setBusyServiceId] = useState<string | null>(null);
  const canManageServices = atLeast('admin');

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
    product.gstRate = tier.amount > 0 ? 18 : 0;
    product.gst_rate = product.gstRate;

    addToCart(product);
    router.push('/checkout?source=services');
    setBusyServiceId(null);
  };

  return (
    <div className="relative overflow-hidden bg-slate-950 text-slate-200">
      <div className="pointer-events-none absolute inset-0 bg-[url('/noise.svg')] opacity-20" />
      <div className="pointer-events-none absolute left-1/2 top-32 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[140px]" />

      <HeroCarousel pageKey="services" />

      <div className="relative mx-auto flex max-w-7xl flex-col gap-16 px-4 pb-20 pt-0 sm:px-6 lg:px-8 sm:pt-0">
        <section className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-violet-300">
            End-to-end Solutions
          </div>
          <h1 className="mt-6 text-4xl font-semibold text-white sm:text-5xl lg:text-6xl">
            Smart Solutions{' '}
            <span className="bg-gradient-to-r from-cyan-300 via-violet-400 to-pink-400 bg-clip-text text-transparent">
              for Every Need
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-400 sm:text-lg">
            CCTV · Home Automation · IT Services · RFID Locks &amp; Cards · Web Development — professional installation and support across Goa.
          </p>
          {canManageServices && (
            <div className="mt-6 flex justify-center">
              <Link
                href="/management/admin/services"
                className="inline-flex items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-cyan-200 transition-colors hover:border-cyan-400/60"
              >
                Manage Services
              </Link>
            </div>
          )}
        </section>

        {/* ── Core Services Grid ── */}
        <section>
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">Our 5 Core Services</h2>
            <p className="mt-2 text-sm text-slate-400">Every service includes a site survey, professional installation, and post-setup support.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {coreServices.map((svc) => {
              const Icon = svc.icon;
              return (
                <div
                  key={svc.title}
                  className={`group flex flex-col rounded-2xl border ${svc.border} bg-slate-900/60 p-6 shadow-md transition-all duration-300 hover:-translate-y-1`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${svc.color} shadow-lg transition-transform duration-300 group-hover:scale-110`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{svc.title}</h3>
                      <p className={`text-xs font-semibold ${svc.text}`}>{svc.subtitle}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-slate-400 leading-relaxed">{svc.description}</p>
                  <ul className="mt-4 space-y-2">
                    {svc.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-slate-500">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto pt-5">
                    <Button
                      variant="outline"
                      className={`w-full justify-center ${svc.border} ${svc.text} hover:${svc.bg}`}
                      onClick={() => router.push(svc.cta)}
                    >
                      {svc.ctaLabel}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-white/5 bg-black/20 p-6 sm:p-10">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-3xl font-semibold text-white">Service Rates & AMC Plans</h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-400">
                Transparent pricing tiers across CCTV and computer services. Final quotations include on-site assessment, travel, and consumables.
              </p>
            </div>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition-colors hover:border-cyan-400/60"
            >
              Request a Quote
            </Link>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {servicePricing.map((category) => (
              <div key={category.category} className="rounded-2xl border border-white/5 bg-slate-900/60 p-6">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-1 rounded-full bg-cyan-400" />
                  <div>
                    <h3 className="text-xl font-semibold text-white">{category.category}</h3>
                    <p className="text-sm text-slate-400">{category.blurb}</p>
                  </div>
                </div>
                <div className="mt-6 space-y-4">
                  {category.plans.map((plan) => (
                    <div key={plan.name} className="rounded-xl border border-white/5 bg-black/30 p-4">
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-semibold text-white">{plan.name}</p>
                        <p className="text-xs text-slate-500">{plan.summary}</p>
                      </div>
                      <div className="mt-4 grid gap-3">
                        {plan.tiers.map((tier) => {
                          const tierId = `pricing-${slugify(category.category)}-${slugify(plan.name)}-${slugify(tier.label)}`;
                          const hasPrice = Boolean(tier.amount);
                          return (
                            <div
                              key={tier.label}
                              className="flex flex-col gap-2 rounded-lg border border-white/5 bg-slate-950/60 p-4"
                            >
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">{tier.label}</p>
                                <p className="text-lg font-semibold text-cyan-200">{tier.price}</p>
                              </div>
                              <p className="text-xs text-slate-500">{tier.detail}</p>
                              <button
                                type="button"
                                className="mt-2 inline-flex w-full items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition-colors hover:border-cyan-400/40 hover:bg-cyan-500/10"
                                disabled={!hasPrice || busyServiceId === tierId}
                                onClick={() => handlePricingTierAdd(category.category, plan, tier)}
                              >
                                {hasPrice ? 'Add to Cart' : 'Request Quote'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-slate-500">
            *All prices are indicative. Taxes, hardware, and travel charges (if applicable) are shared on the final quotation.
          </p>
        </section>

        <section className="rounded-3xl border border-white/5 bg-slate-900/40 p-6 sm:p-10">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 rounded-full bg-violet-400" />
            <div>
              <h2 className="text-2xl font-semibold text-white">Annual Maintenance Contract (AMC) Terms</h2>
              <p className="text-sm text-slate-400">General terms and conditions for CCTV and PC AMC plans.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 text-sm text-slate-300">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-500">Company</p>
              <p className="font-semibold text-white">{companyInfo.name}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-500">CIN</p>
              <p>{companyInfo.cin}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-500">Udyam</p>
              <p>{companyInfo.udyam}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-500">GSTIN</p>
              <p>{companyInfo.gstin}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-500">CEO</p>
              <p>{companyInfo.ceo}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-500">Website</p>
              <a href={companyInfo.website} target="_blank" rel="noopener noreferrer" className="text-cyan-300 hover:text-cyan-200">
                {companyInfo.website.replace('https://', '')}
              </a>
            </div>
          </div>

          <div className="mt-8 grid gap-4">
            {amcTerms.map((term) => (
              <div key={term.title} className="rounded-2xl border border-white/5 bg-slate-950/60 p-5">
                <h3 className="text-lg font-semibold text-white">{term.title}</h3>
                {term.description && <p className="mt-1 text-sm text-slate-400">{term.description}</p>}
                {term.bullets && (
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-400">
                    {term.bullets.map((bullet, index) => (
                      <li key={index}>{bullet}</li>
                    ))}
                  </ul>
                )}
                {term.sections && (
                  <div className="mt-4 space-y-4">
                    {term.sections.map((section) => (
                      <div key={section.title}>
                        <p className="text-sm font-semibold text-white">{section.title}</p>
                        {section.description && <p className="text-sm text-slate-400">{section.description}</p>}
                        <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-400">
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
        </section>

        <section className="rounded-2xl border border-white/10 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-violet-500/10 p-8 text-center">
          <h2 className="text-2xl font-semibold text-white">Need Custom Solutions?</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-slate-400">
            Share your requirements and our team will craft a tailored setup for your space.
          </p>
          <Link
            href="/contact"
            className="mt-6 inline-flex items-center justify-center rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-5 py-3 text-sm font-semibold text-cyan-200 transition-colors hover:border-cyan-400/70"
          >
            Contact Our Experts
          </Link>
        </section>
      </div>
    </div>
  );
}