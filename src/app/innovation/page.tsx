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

type ModeKey = 'security' | 'chill' | 'energy';

type ModeItem = {
  icon: React.ReactNode;
  text: string;
  accent: string;
};

type ModeConfig = {
  title: string;
  desc: string;
  icon: React.ReactNode;
  items: ModeItem[];
  recId: string;
};

const MODE_CONFIG: Record<ModeKey, ModeConfig> = {
  security: {
    title: 'Fortress Configuration',
    desc: 'A robust perimeter defense setup utilizing door sensors, motion detection, and automated alert lighting.',
    icon: <Shield className="h-24 w-24 text-white/10" />,
    items: [
      { icon: <DoorClosed className="h-4 w-4" />, text: 'Entry Sensors', accent: 'text-violet-300' },
      { icon: <Wifi className="h-4 w-4" />, text: 'Motion Detectors', accent: 'text-violet-300' },
      { icon: <Bell className="h-4 w-4" />, text: 'Smart Siren', accent: 'text-violet-300' },
      { icon: <Camera className="h-4 w-4" />, text: 'IP Cam Integration', accent: 'text-violet-300' },
    ],
    recId: 'SEC-01',
  },
  chill: {
    title: 'Relaxation Protocol',
    desc: 'Automated mood lighting and climate control designed for evening downtime and media consumption.',
    icon: <Speaker className="h-24 w-24 text-white/10" />,
    items: [
      { icon: <Lightbulb className="h-4 w-4" />, text: 'RGB Ambient Light', accent: 'text-cyan-300' },
      { icon: <Cpu className="h-4 w-4" />, text: 'Automation Logic', accent: 'text-cyan-300' },
      { icon: <Speaker className="h-4 w-4" />, text: 'Audio Sync', accent: 'text-cyan-300' },
      { icon: <Zap className="h-4 w-4" />, text: 'Dimmer Switches', accent: 'text-cyan-300' },
    ],
    recId: 'RLX-05',
  },
  energy: {
    title: 'Eco-Efficiency Grid',
    desc: 'Optimize power usage with smart scheduling for heavy appliances and precise radar sensing.',
    icon: <Leaf className="h-24 w-24 text-white/10" />,
    items: [
      { icon: <Zap className="h-4 w-4" />, text: 'Heavy Duty Plugs', accent: 'text-emerald-300' },
      { icon: <Cpu className="h-4 w-4" />, text: 'Schedule Timers', accent: 'text-emerald-300' },
      { icon: <Leaf className="h-4 w-4" />, text: 'Usage Monitoring', accent: 'text-emerald-300' },
      { icon: <Wifi className="h-4 w-4" />, text: 'mmWave Radar', accent: 'text-emerald-300' },
    ],
    recId: 'ECO-99',
  },
};

export default function InnovationPage() {
  const [activeMode, setActiveMode] = React.useState<ModeKey>('security');
  const config = MODE_CONFIG[activeMode];

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
                  href="#new-devices"
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

      <section id="new-devices" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
            <div>
              <h2 className="text-3xl font-bold text-white font-tech">New Arrivals</h2>
              <p className="mt-1 text-sm text-slate-400">Latest integrations in our inventory.</p>
            </div>
            <div className="flex gap-2">
              <span className="h-3 w-3 rounded-full bg-violet-500" />
              <span className="h-3 w-3 rounded-full bg-white/10" />
              <span className="h-3 w-3 rounded-full bg-white/10" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {[
              {
                title: 'Biometric Smart Lock Pro',
                desc: 'Fingerprint • RFID • App Control',
                accent: 'violet',
                icon: <Shield className="h-16 w-16" />,
                chips: ['1 Year Battery', 'AES-128 Enc', 'Remote Unlock', 'Tamper Alert'],
              },
              {
                title: 'mmWave Presence Sensor',
                desc: 'Micro-Motion Breath Detection',
                accent: 'cyan',
                icon: <Wifi className="h-16 w-16" />,
                chips: ['Sub-mm Accuracy', '24/7 Powered', 'Light Sensor', 'Zigbee 3.0'],
              },
              {
                title: 'Neon Flex RGBIC',
                desc: 'Addressable LED • Music Sync',
                accent: 'amber',
                icon: <Lightbulb className="h-16 w-16" />,
                chips: ['16M Colors', 'Voice Control', 'IP67 Waterproof', 'Auto Schedule'],
              },
            ].map((device) => (
              <div
                key={device.title}
                className="spotlight-card group rounded-3xl border border-white/5 bg-slate-900/60 p-1 transition-colors hover:border-violet-400/50"
                onMouseMove={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  const x = event.clientX - rect.left;
                  const y = event.clientY - rect.top;
                  event.currentTarget.style.setProperty('--spotlight-x', `${x}px`);
                  event.currentTarget.style.setProperty('--spotlight-y', `${y}px`);
                }}
              >
                <div className="relative flex h-64 items-center justify-center overflow-hidden rounded-[20px] bg-black/40">
                  <div className="absolute left-4 top-4 z-10">
                    <span className="rounded border border-white/10 bg-white/5 px-2 py-1 text-xs font-bold text-white">
                      NEW
                    </span>
                  </div>
                  <div className="text-slate-600 transition-colors duration-500 group-hover:text-violet-300">
                    {device.icon}
                  </div>
                  <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/90 to-transparent p-6">
                    <h3 className="text-xl font-bold text-white">{device.title}</h3>
                    <p className="text-sm text-slate-400">{device.desc}</p>
                  </div>
                </div>
                <div className="p-6">
                  <div className="mb-6 grid grid-cols-2 gap-4 text-xs text-slate-400">
                    {device.chips.map((chip) => (
                      <div key={chip} className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-violet-400/60" />
                        {chip}
                      </div>
                    ))}
                  </div>
                  <button className="w-full rounded-lg border border-white/10 py-2 text-sm font-bold text-white transition-colors hover:bg-white/5">
                    View Specs
                  </button>
                </div>
              </div>
            ))}
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
              {([
                { key: 'security', label: 'Fortress Mode', sub: 'Security & Monitoring', icon: <Shield className="h-5 w-5" /> },
                { key: 'chill', label: 'Chill Ambience', sub: 'Lighting & Comfort', icon: <Lightbulb className="h-5 w-5" /> },
                { key: 'energy', label: 'Eco Saver', sub: 'Automation & Efficiency', icon: <Leaf className="h-5 w-5" /> },
              ] as const).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveMode(tab.key)}
                  className={`config-tab flex w-full items-center justify-between rounded-xl border border-white/10 bg-slate-900/60 p-4 text-left transition-all hover:bg-white/5 ${
                    activeMode === tab.key ? 'active' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-violet-200">
                      {tab.icon}
                    </div>
                    <div>
                      <h4 className={`font-bold ${activeMode === tab.key ? 'text-white' : 'text-slate-300'}`}>
                        {tab.label}
                      </h4>
                      <p className="text-xs text-slate-500">{tab.sub}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-600" />
                </button>
              ))}
            </div>

            <div className="relative flex h-[420px] flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 p-8 lg:col-span-2">
              <div>
                <h3 className="mb-2 text-2xl font-bold text-white font-tech">{config.title}</h3>
                <p className="mb-6 text-slate-400">{config.desc}</p>
                <div className="grid grid-cols-2 gap-4">
                  {config.items.map((item) => (
                    <div key={item.text} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
                      <span className={item.accent}>{item.icon}</span>
                      <span className="text-sm text-white">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative z-10 mt-6 flex items-center justify-between border-t border-white/5 pt-6 text-xs text-slate-500">
                <span className="font-mono">REC_PKG_ID: {config.recId}</span>
                <Link href="/contact" className="flex items-center gap-2 text-sm font-bold text-cyan-300 hover:text-white">
                  Request This Setup <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="pointer-events-none absolute -bottom-6 -right-6 opacity-70">
                {config.icon}
              </div>
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
