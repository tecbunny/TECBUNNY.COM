'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Shield,
  Wifi,
  Bell,
  Camera,
  Lightbulb,
  Cpu,
  Zap,
  Leaf,
  DoorClosed,
  Speaker,
} from 'lucide-react';

import type { InnovationDevice, InnovationMode } from '../lib/types';
import HeroCarousel from './HeroCarousel';

const iconMap = {
  Shield,
  Wifi,
  Bell,
  Camera,
  Lightbulb,
  Cpu,
  Zap,
  Leaf,
  DoorClosed,
  Speaker,
} as const;

interface InnovationPageProps {
  modes: InnovationMode[];
  devices: InnovationDevice[];
}

export default function InnovationPage({ modes, devices }: InnovationPageProps) {
  const sortedModes = React.useMemo(
    () =>
      (modes || [])
        .filter((mode) => mode.is_active !== false)
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)),
    [modes]
  );

  const sortedDevices = React.useMemo(
    () =>
      (devices || [])
        .filter((device) => device.is_active !== false)
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)),
    [devices]
  );

  const [activeModeKey, setActiveModeKey] = React.useState<string>(sortedModes[0]?.key ?? '');

  React.useEffect(() => {
    if (!activeModeKey && sortedModes.length > 0) {
      setActiveModeKey(sortedModes[0].key);
    }
  }, [activeModeKey, sortedModes]);

  const activeMode = sortedModes.find((mode) => mode.key === activeModeKey) ?? sortedModes[0];
  const ActiveModeIcon = activeMode ? iconMap[activeMode.icon as keyof typeof iconMap] || Shield : Shield;

  return (
    <div className="bg-[#030712] text-slate-200">
      <section className="relative border-b border-white/5 pt-28 pb-24 tech-grid-lines">
        <div className="pointer-events-none absolute right-1/4 top-20 h-96 w-96 rounded-full bg-violet-500/10 blur-[100px]" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.3em] text-violet-200">
                Next-gen protocols
              </div>
              <h1 className="mb-6 text-4xl font-bold text-white sm:text-5xl lg:text-6xl font-tech">
                Intelligent <br />
                <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">
                  Ecosystems.
                </span>
              </h1>
              <p className="mb-10 max-w-lg text-base text-slate-400 sm:text-lg">
                Beyond simple switches. We engineer responsive environments that react to your presence, schedule, and
                security needs using advanced Matter & Zigbee architecture.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="#featured-tech"
                  className="rounded-lg bg-violet-500 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/20 transition-colors hover:bg-white hover:text-slate-900"
                >
                  Explore New Tech
                </Link>
                <Link
                  href="#customizer"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-white/5"
                >
                  Customize <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="relative flex h-[420px] items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-violet-500/20 border-dashed animate-spin [animation-duration:12s]" />
              <div className="absolute inset-8 rounded-full border border-blue-500/20 border-dashed animate-spin [animation-duration:14s] [animation-direction:reverse]" />
              <div className="relative z-10 rounded-2xl border border-violet-400/30 bg-white/5 p-8 backdrop-blur-xl">
                <div className="mb-4 flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-violet-500/20 text-violet-200">
                    <Wifi className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">Hub Online</h3>
                    <p className="text-xs text-emerald-300">Signal Strength: 98%</p>
                  </div>
                </div>
                <div className="space-y-3 text-sm text-slate-400">
                  <div className="flex items-center justify-between">
                    <span>Living Room</span>
                    <span className="text-white">Active</span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-3/4 bg-violet-400" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Perimeter</span>
                    <span className="text-white">Armed</span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-full bg-cyan-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <HeroCarousel pageKey="innovations" />

      {/* ── Featured Technology Solutions ── */}
      <section id="featured-tech" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/8 px-3 py-1 text-xs font-bold uppercase tracking-widest text-violet-300">
              What We Deploy
            </div>
            <h2 className="mt-5 text-3xl font-bold text-white font-tech sm:text-4xl">
              Technology at the Core
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-slate-400">
              Every solution we install runs on proven, enterprise-grade technology — built for reliability, security, and remote control.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

            {/* CCTV */}
            <div className="group relative overflow-hidden rounded-3xl border border-white/5 bg-slate-900/60 p-6 transition-all duration-300 hover:border-cyan-400/30 hover:-translate-y-1">
              <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-cyan-500/8 blur-2xl" />
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg">
                  <Camera className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">CCTV Surveillance</h3>
                  <p className="text-xs text-cyan-300">Smart Security Systems</p>
                </div>
              </div>
              <p className="mb-5 text-sm text-slate-400 leading-relaxed">
                Full HD & 4K IP camera systems with H.265 compression, IR night vision up to 40 m, and real-time alerts on your phone via dedicated mobile apps.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {['H.265 Codec', '4K Ultra HD', 'IR Night Vision', 'Motion Alerts', 'Cloud Backup', 'Remote Access'].map((spec) => (
                  <div key={spec} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-300">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                    {spec}
                  </div>
                ))}
              </div>
              <Link href="/services" className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-300 hover:text-white">
                Get a Quote <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Home Automation */}
            <div className="group relative overflow-hidden rounded-3xl border border-white/5 bg-slate-900/60 p-6 transition-all duration-300 hover:border-violet-400/30 hover:-translate-y-1">
              <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-violet-500/8 blur-2xl" />
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
                  <Lightbulb className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Home Automation</h3>
                  <p className="text-xs text-violet-300">Matter & Zigbee Protocol</p>
                </div>
              </div>
              <p className="mb-5 text-sm text-slate-400 leading-relaxed">
                Smart switches, sensors, and hubs to automate lights, fans, ACs, and appliances — controllable via app, voice assistants, or automated schedules.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {['Matter Protocol', 'Zigbee 3.0', 'Voice Control', 'Energy Monitor', 'Scene Automation', 'App Control'].map((spec) => (
                  <div key={spec} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-300">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                    {spec}
                  </div>
                ))}
              </div>
              <Link href="/services" className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-violet-300 hover:text-white">
                Request Setup <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* RFID Access Control */}
            <div className="group relative overflow-hidden rounded-3xl border border-white/5 bg-slate-900/60 p-6 transition-all duration-300 hover:border-orange-400/30 hover:-translate-y-1">
              <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-orange-500/8 blur-2xl" />
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg">
                  <DoorClosed className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">RFID Access Control</h3>
                  <p className="text-xs text-orange-300">Smart Locks & Custom Cards</p>
                </div>
              </div>
              <p className="mb-5 text-sm text-slate-400 leading-relaxed">
                RFID-based smart door locks with AES-128 encryption, multi-user card management, access logs, and fully custom-designed branded RFID cards for offices, homes, and hotels.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {['AES-128 Encrypted', 'Multi-User Cards', 'Custom RFID Design', 'Access Logging', 'Anti-Tamper Alert', 'Remote Revoke'].map((spec) => (
                  <div key={spec} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-300">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
                    {spec}
                  </div>
                ))}
              </div>
              <Link href="/services" className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-orange-300 hover:text-white">
                Get RFID Quote <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

          </div>


        </div>
      </section>

      <section id="customizer" className="border-y border-white/10 bg-white/5 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-white font-tech">Tailor Your Experience</h2>
            <p className="mt-2 text-slate-400">Select a scenario to visualize recommended configurations.</p>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-4">
              {sortedModes.map((mode) => {
                const TabIcon = iconMap[mode.icon as keyof typeof iconMap] || Shield;
                return (
                  <button
                    key={mode.key}
                    type="button"
                    onClick={() => setActiveModeKey(mode.key)}
                    className={`config-tab flex w-full items-center justify-between rounded-xl border border-white/10 bg-slate-900/60 p-4 text-left transition-all hover:bg-white/5 ${
                      activeModeKey === mode.key ? 'active' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-violet-200">
                        <TabIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className={`font-bold ${activeModeKey === mode.key ? 'text-white' : 'text-slate-300'}`}>
                          {mode.label}
                        </h4>
                        <p className="text-xs text-slate-500">{mode.sub}</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-600" />
                  </button>
                );
              })}
            </div>

            <div className="relative flex h-[420px] flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 p-8 lg:col-span-2">
              {activeMode ? (
                <>
                  <div>
                    <h3 className="mb-2 text-2xl font-bold text-white font-tech">{activeMode.title}</h3>
                    <p className="mb-6 text-slate-400">{activeMode.description}</p>
                    <div className="grid grid-cols-2 gap-4">
                      {activeMode.items?.map((item, index) => {
                        const ItemIcon = iconMap[item.icon as keyof typeof iconMap] || Zap;
                        return (
                          <div
                            key={`${item.text}-${index}`}
                            className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3"
                          >
                            <span className={item.accent}>
                              <ItemIcon className="h-4 w-4" />
                            </span>
                            <span className="text-sm text-white">{item.text}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="relative z-10 mt-6 flex items-center justify-between border-t border-white/5 pt-6 text-xs text-slate-500">
                    <span className="font-mono">REC_PKG_ID: {activeMode.rec_id}</span>
                    <Link href="/contact" className="flex items-center gap-2 text-sm font-bold text-cyan-300 hover:text-white">
                      Request This Setup <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>

                  <div className="pointer-events-none absolute -bottom-6 -right-6 opacity-70">
                    <ActiveModeIcon className="h-24 w-24 text-white/10" />
                  </div>
                </>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                  No innovation modes available.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/5 bg-white/5 py-20">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mb-8 text-3xl font-bold text-white font-tech">Works With Your Ecosystem</h2>
          <div className="flex flex-wrap justify-center gap-10 text-slate-300">
            <div className="flex items-center gap-3">
              <Speaker className="h-6 w-6 text-white" />
              <span className="text-lg font-bold text-white">Voice Assistants</span>
            </div>
            <div className="flex items-center gap-3">
              <Cpu className="h-6 w-6 text-white" />
              <span className="text-lg font-bold text-white">Smart Hubs</span>
            </div>
            <div className="flex items-center gap-3">
              <Wifi className="h-6 w-6 text-white" />
              <span className="text-lg font-bold text-white">Mobile Apps</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
