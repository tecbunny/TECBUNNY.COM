import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Code,
  Files,
  Globe,
  LayoutDashboard,
  MessageCircle,
  Palette,
  Rocket,
  ShieldCheck,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Web Development Services | TecBunny Solutions',
  description: 'Professional website and web application development across Goa. Custom designs, admin dashboards, e-commerce, SEO-ready, and WhatsApp integration.',
  keywords: ['web development Goa', 'website building Goa', 'e-commerce Goa', 'custom website Goa', 'TecBunny web development'],
};

const features = [
  {
    icon: MessageCircle,
    title: 'WhatsApp Integration',
    description: 'Direct customer communication built right into your website for instant lead capture.',
    color: 'from-emerald-500 to-teal-600',
    border: 'border-emerald-500/20',
    text: 'text-emerald-300',
  },
  {
    icon: Palette,
    title: 'Unique Design',
    description: "Custom-crafted designs tailored to your brand. No generic templates — everything is built for you.",
    color: 'from-violet-500 to-purple-600',
    border: 'border-violet-500/20',
    text: 'text-violet-300',
  },
  {
    icon: LayoutDashboard,
    title: 'Admin Dashboard',
    description: 'Easy-to-use backend for managing content, products, orders, and viewing analytics.',
    color: 'from-blue-500 to-cyan-600',
    border: 'border-blue-500/20',
    text: 'text-blue-300',
  },
  {
    icon: Files,
    title: 'Multiple Pages',
    description: 'Comprehensive multi-page structure to showcase every aspect of your business.',
    color: 'from-orange-500 to-amber-600',
    border: 'border-orange-500/20',
    text: 'text-orange-300',
  },
  {
    icon: ShieldCheck,
    title: 'Secure & Fast',
    description: 'SSL, secure authentication, optimised images, and CDN-backed hosting for maximum performance.',
    color: 'from-pink-500 to-rose-600',
    border: 'border-pink-500/20',
    text: 'text-pink-300',
  },
  {
    icon: Globe,
    title: 'SEO Ready',
    description: 'Structured data, sitemap, metadata, and page-speed optimisations baked in from day one.',
    color: 'from-cyan-500 to-blue-600',
    border: 'border-cyan-500/20',
    text: 'text-cyan-300',
  },
];

export default function WebDevPage() {
  return (
    <div className="relative overflow-hidden bg-slate-950 text-slate-200">
      <div className="pointer-events-none absolute inset-0 bg-[url('/noise.svg')] opacity-20" />
      <div className="pointer-events-none absolute left-1/2 top-32 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-pink-500/8 blur-[140px]" />

      <div className="relative mx-auto flex max-w-7xl flex-col gap-20 px-4 pb-24 pt-24 sm:px-6 lg:px-8">

        {/* Hero */}
        <section className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-pink-400/30 bg-pink-500/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-pink-300">
            Web Development
          </div>
          <h1 className="mt-6 text-4xl font-bold text-white sm:text-5xl lg:text-6xl">
            Your Digital Presence,{' '}
            <span className="bg-gradient-to-r from-pink-300 via-violet-400 to-cyan-300 bg-clip-text text-transparent">
              Built Right
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-slate-400 sm:text-lg">
            We design and develop fast, secure, SEO-ready websites and web applications for businesses across Goa.
            The website you&apos;re viewing right now is engineered by us — a live example of what we build.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/contact?subject=web_development"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-pink-500/20 transition-transform hover:scale-105 active:scale-100"
            >
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/services"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-8 py-3 text-sm font-semibold text-slate-300 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              View All Services
            </Link>
          </div>
        </section>

        {/* What we build */}
        <section className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-3xl font-bold text-white sm:text-4xl">Website Building Services</h2>
            <p className="mt-4 text-base text-slate-400 leading-relaxed">
              From simple business portfolios to full e-commerce platforms and complex web applications — we build it all.
              Every project is responsive, secure, and optimised for search engines from the ground up.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                'Responsive mobile-first design',
                'SEO optimisation & structured data',
                'Fast loading with CDN & image optimisation',
                'Secure authentication & SSL setup',
                'E-commerce & payment gateway integration',
                'Ongoing maintenance & support',
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-slate-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative flex h-72 items-center justify-center rounded-3xl border border-white/5 bg-slate-900/60 lg:h-80">
            <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-pink-500/5 via-violet-500/5 to-cyan-500/5" />
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 shadow-2xl shadow-pink-500/20">
                <Code className="h-12 w-12 text-white" />
              </div>
              <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-300">
                <Rocket className="h-3.5 w-3.5" /> Live on the web in days
              </div>
            </div>
          </div>
        </section>

        {/* Features grid */}
        <section>
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">Why Choose Our Web Solutions?</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-slate-400">
              We deliver more than just a website — a complete digital business tool built to grow with you.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className={`group flex flex-col rounded-2xl border ${feature.border} bg-slate-900/60 p-6 transition-all duration-300 hover:-translate-y-1`}
                >
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${feature.color} shadow-lg transition-transform duration-300 group-hover:scale-110`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-white">{feature.title}</h3>
                  <p className="mt-2 text-sm text-slate-400 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <section className="rounded-3xl border border-white/10 bg-gradient-to-r from-pink-500/10 via-violet-500/10 to-cyan-500/10 p-10 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">Ready to Build Your Website?</h2>
          <p className="mx-auto mt-4 max-w-lg text-sm text-slate-400">
            Share your requirements and we&apos;ll craft a tailored plan with a transparent quote. No obligation.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/contact?subject=web_development"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-pink-500/20 transition-transform hover:scale-105 active:scale-100"
            >
              Contact Us Now <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/customised-setups"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-8 py-3 text-sm font-semibold text-slate-300 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              Get Instant Quote
            </Link>
          </div>
          <p className="mt-6 text-xs text-slate-600">
            📞 +91 96041 36010 &nbsp;·&nbsp; support@tecbunny.com &nbsp;·&nbsp; Goa, India
          </p>
        </section>

      </div>
    </div>
  );
}

