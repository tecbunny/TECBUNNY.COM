'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Cctv, Home, Cpu, KeyRound, Globe, ArrowRight } from 'lucide-react';
import {
  CctvRequestForm,
  HomeAutomationRequestForm,
  ItServicesRequestForm,
  RfidRequestForm,
  WebDevRequestForm,
} from '@/components/shared/ServiceRequestForms';

// ─── Service definitions ────────────────────────────────────────────────────
const SERVICES = [
  {
    id: 'cctv',
    label: 'CCTV',
    sublabel: 'Surveillance & Security',
    icon: Cctv,
    gradient: 'from-cyan-500 to-blue-600',
    ring: 'ring-cyan-500/40',
    active: 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20',
    inactive: 'bg-white/[0.04] border border-white/10 text-slate-400 hover:text-white hover:border-white/20',
    Form: CctvRequestForm,
  },
  {
    id: 'home-automation',
    label: 'Home Automation',
    sublabel: 'Smart Home Control',
    icon: Home,
    gradient: 'from-violet-500 to-purple-600',
    ring: 'ring-violet-500/40',
    active: 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/20',
    inactive: 'bg-white/[0.04] border border-white/10 text-slate-400 hover:text-white hover:border-white/20',
    Form: HomeAutomationRequestForm,
  },
  {
    id: 'it-services',
    label: 'IT Services',
    sublabel: 'Complete Tech Support',
    icon: Cpu,
    gradient: 'from-emerald-500 to-teal-600',
    ring: 'ring-emerald-500/40',
    active: 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20',
    inactive: 'bg-white/[0.04] border border-white/10 text-slate-400 hover:text-white hover:border-white/20',
    Form: ItServicesRequestForm,
  },
  {
    id: 'rfid-locks',
    label: 'RFID Locks',
    sublabel: 'Access Control',
    icon: KeyRound,
    gradient: 'from-orange-500 to-amber-600',
    ring: 'ring-orange-500/40',
    active: 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/20',
    inactive: 'bg-white/[0.04] border border-white/10 text-slate-400 hover:text-white hover:border-white/20',
    Form: RfidRequestForm,
  },
  {
    id: 'web-development',
    label: 'Web Development',
    sublabel: 'Websites & Web Apps',
    icon: Globe,
    gradient: 'from-pink-500 to-rose-600',
    ring: 'ring-pink-500/40',
    active: 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-500/20',
    inactive: 'bg-white/[0.04] border border-white/10 text-slate-400 hover:text-white hover:border-white/20',
    Form: WebDevRequestForm,
  },
] as const;

type ServiceId = (typeof SERVICES)[number]['id'];
const VALID_IDS = SERVICES.map(s => s.id) as string[];

// ─── Inner component (needs Suspense because it calls useSearchParams) ────────
function RequestPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const paramService = searchParams.get('service') ?? '';
  const initial: ServiceId = VALID_IDS.includes(paramService) ? (paramService as ServiceId) : 'cctv';
  const [active, setActive] = React.useState<ServiceId>(initial);

  // Sync URL when tab changes
  const select = (id: ServiceId) => {
    setActive(id);
    router.replace(`/request?service=${id}`, { scroll: false });
  };

  // Sync active state if user navigates back/forward
  React.useEffect(() => {
    const sp = searchParams.get('service') ?? '';
    if (VALID_IDS.includes(sp) && sp !== active) setActive(sp as ServiceId);
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const current = SERVICES.find(s => s.id === active)!;
  const Icon = current.icon;
  const Form = current.Form;

  return (
    <main className="min-h-screen bg-[#080d17] text-white">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-white/[0.06] bg-gradient-to-b from-slate-900 to-[#080d17] px-4 py-16 text-center">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(6,182,212,0.08),transparent)]" />
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-cyan-400">TecBunny Solutions</p>
        <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
          Request a{' '}
          <span className={`bg-gradient-to-r ${current.gradient} bg-clip-text text-transparent`}>Service</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-slate-400">
          Fill in the details below and our team will get back to you within 24 hours with a quote and next steps.
        </p>
        {/* Trust bar */}
        <div className="mx-auto mt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500">
          {['100+ Happy Clients', '5-Star Rated Service', 'Serving All of Goa', 'Response within 24 hrs'].map(t => (
            <span key={t} className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-cyan-500" />
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* ── Service Tabs ── */}
      <section className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#080d17]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 py-3 scrollbar-none">
          {SERVICES.map(s => {
            const SIcon = s.icon;
            const isActive = s.id === active;
            return (
              <button
                key={s.id}
                onClick={() => select(s.id)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${isActive ? s.active : s.inactive}`}
              >
                <SIcon className="h-4 w-4" />
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{s.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Form Card ── */}
      <section className="mx-auto max-w-5xl px-4 py-12">
        <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] shadow-2xl shadow-black/50">
          {/* Card header */}
          <div className={`flex items-center gap-4 bg-gradient-to-r ${current.gradient} bg-opacity-10 px-6 py-5`}>
            <div className="rounded-xl bg-white/20 p-2.5">
              <Icon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{current.label} Request</h2>
              <p className="text-xs text-white/70">{current.sublabel}</p>
            </div>
            <a
              href="/services"
              className="ml-auto flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/20"
            >
              View All Services <ArrowRight className="h-3 w-3" />
            </a>
          </div>
          {/* Form body */}
          <div className="p-6">
            <Form />
          </div>
        </div>

        {/* Other services quick links */}
        <div className="mt-10">
          <p className="mb-4 text-center text-xs font-semibold uppercase tracking-widest text-slate-500">Other Services</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {SERVICES.filter(s => s.id !== active).map(s => {
              const SIcon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => select(s.id)}
                  className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm transition hover:border-white/15 hover:bg-white/[0.05]"
                >
                  <SIcon className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-300">{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}

// ─── Page export wrapped in Suspense ────────────────────────────────────────
export default function RequestPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#080d17]" />}>
      <RequestPageInner />
    </Suspense>
  );
}
