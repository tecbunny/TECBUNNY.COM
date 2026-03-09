'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  ArrowRight,
  Cctv,
  CheckCircle2,
  Code,
  Cpu,
  Home,
  KeyRound,
  LogIn,
  Package,
  Phone,
  ShoppingBag,
  Sparkles,
  Star,
  UserPlus,
  X,
  Zap,
} from 'lucide-react';

const SHOW_INTERVAL_MS = 5 * 60 * 60 * 1000; // 5 hours

// ─── Popup type resolution ────────────────────────────────────────────────────
type PopupType = 'home' | 'products' | 'services';

function resolvePopupType(path: string): PopupType {
  if (path === '/') return 'home';
  if (path.startsWith('/products')) return 'products';
  return 'services';
}

function storageKey(type: PopupType) {
  return `tb_popup_${type}_v1`;
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const coreServices = [
  { icon: Cctv,     label: 'CCTV Surveillance',  color: 'bg-cyan-500/15 text-cyan-300',    dot: 'bg-cyan-400' },
  { icon: Home,     label: 'Home Automation',     color: 'bg-violet-500/15 text-violet-300', dot: 'bg-violet-400' },
  { icon: Cpu,      label: 'IT Services & AMC',   color: 'bg-emerald-500/15 text-emerald-300', dot: 'bg-emerald-400' },
  { icon: KeyRound, label: 'RFID Locks & Cards',  color: 'bg-orange-500/15 text-orange-300', dot: 'bg-orange-400' },
  { icon: Code,     label: 'Web Development',     color: 'bg-pink-500/15 text-pink-300',    dot: 'bg-pink-400' },
];

const featuredProducts = [
  { name: 'HD 4MP CCTV Camera', tag: 'Best Seller', badge: 'bg-cyan-500/15 text-cyan-300',    price: '₹2,499' },
  { name: 'NVR 8-Channel Kit',  tag: 'New Arrival', badge: 'bg-violet-500/15 text-violet-300', price: '₹7,999' },
  { name: 'Smart WiFi Router',  tag: 'Top Rated',   badge: 'bg-emerald-500/15 text-emerald-300', price: '₹1,899' },
  { name: 'RFID Door Lock Pro', tag: 'Trending',    badge: 'bg-orange-500/15 text-orange-300', price: '₹4,599' },
];

// ─── Countdown hook ────────────────────────────────────────────────────────────
function useCountdown(active: boolean, minutes: number) {
  const [secs, setSecs] = useState(minutes * 60);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!active) return;
    ref.current = setInterval(() => setSecs((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [active]);
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  return { mm, ss };
}

// ─── Shared pieces ─────────────────────────────────────────────────────────────
function CloseBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="absolute right-4 top-4 z-30 flex h-7 w-7 items-center justify-center rounded-full bg-white/8 text-slate-400 transition hover:bg-white/15 hover:text-white"
      aria-label="Close">
      <X className="h-3.5 w-3.5" />
    </button>
  );
}

function TrustBar({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 border-t border-white/5 bg-white/[0.02] px-6 py-3">
      {items.map((t) => (
        <span key={t} className="flex items-center gap-1.5 text-[10px] text-slate-500">
          <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" /> {t}
        </span>
      ))}
    </div>
  );
}

// ─── HOME popup ───────────────────────────────────────────────────────────────
function HomePopup({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#080d17] shadow-2xl shadow-black/60">
      <CloseBtn onClick={onDismiss} />
      <div className="relative overflow-hidden bg-gradient-to-br from-cyan-600 via-violet-700 to-pink-600 px-7 pt-8 pb-7">
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="relative z-10 flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm border border-white/30">
            <Image src="/brand.png" alt="TecBunny" width={28} height={28} className="h-7 w-7 object-contain" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-white/60">Welcome to</p>
            <p className="font-tech font-bold text-lg text-white leading-tight">TecBunny Solutions</p>
          </div>
        </div>
        <h2 className="text-2xl font-extrabold text-white leading-tight">
          Smarter Tech,<br /><span className="text-white/75 text-xl font-semibold">Built for Goa.</span>
        </h2>
        <p className="mt-2 text-sm text-white/65">CCTV · Home Automation · IT · RFID · Web Dev</p>
      </div>
      <div className="px-7 pt-6 pb-2">
        <p className="text-sm text-slate-400 text-center leading-relaxed">
          Create a free account to track orders, save wishlists, and unlock member-only offers.
        </p>
        <ul className="mt-4 space-y-2.5">
          {[
            { icon: ShoppingBag,  text: 'Track your orders in real time' },
            { icon: Star,         text: 'Member-only discounts & early offers' },
            { icon: Zap,          text: 'Faster checkout on future orders' },
          ].map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-sm text-slate-300">
              <Icon className="h-4 w-4 text-cyan-400 shrink-0" />{text}
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-col gap-2">
          <Link href="/auth/signup" onClick={onDismiss}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-500/20 transition-transform hover:scale-[1.02]">
            <UserPlus className="h-4 w-4" /> Create Free Account
          </Link>
          <Link href="/auth/login" onClick={onDismiss}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-3 text-sm font-semibold text-slate-300 transition hover:text-white hover:border-white/20">
            <LogIn className="h-4 w-4" /> Sign In to My Account
          </Link>
          <button onClick={onDismiss} className="text-[11px] text-slate-600 hover:text-slate-400 transition mt-1 mb-2">
            Continue browsing as guest
          </button>
        </div>
      </div>
      <TrustBar items={['Free to join', 'No spam ever', 'Secure & private']} />
    </div>
  );
}

// ─── PRODUCTS popup ───────────────────────────────────────────────────────────
function ProductsPopup({ onDismiss }: { onDismiss: () => void }) {
  const { mm, ss } = useCountdown(true, 10);
  return (
    <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#080d17] shadow-2xl shadow-black/60">
      <CloseBtn onClick={onDismiss} />
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-700 via-pink-700 to-orange-600 px-7 pt-8 pb-6">
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white/90 mb-3">
            <Sparkles className="h-3 w-3" /> New Arrivals
          </div>
          <h2 className="text-2xl font-extrabold text-white leading-tight">
            Hot Products<br /><span className="text-white/70 text-lg font-semibold">Just In Stock</span>
          </h2>
          <div className="flex items-center gap-3 mt-4">
            <p className="text-[11px] text-white/60 uppercase tracking-widest">Deal ends in</p>
            <div className="flex items-center gap-1.5">
              {[mm, ':', ss].map((u, i) => (
                <span key={i} className={i === 1 ? 'text-white/40 font-bold' : 'bg-black/30 border border-white/15 rounded-lg px-2 py-1 text-sm font-black text-white tabular-nums'}>
                  {u}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="px-7 pt-5 pb-2">
        <ul className="space-y-3">
          {featuredProducts.map(({ name, tag, badge, price }) => (
            <li key={name} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
              <div className="flex items-center gap-3">
                <Package className="h-4 w-4 text-slate-500 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-white">{name}</p>
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${badge}`}>{tag}</span>
                </div>
              </div>
              <span className="text-sm font-bold text-emerald-400">{price}</span>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-col gap-2">
          <Link href="/products" onClick={onDismiss}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/20 transition-transform hover:scale-[1.02]">
            <ShoppingBag className="h-4 w-4" /> Shop All Products <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/contact" onClick={onDismiss}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-sm text-slate-400 transition hover:text-white hover:border-white/20">
            <Phone className="h-3.5 w-3.5" /> Ask About a Product
          </Link>
          <button onClick={onDismiss} className="text-[11px] text-slate-600 hover:text-slate-400 transition mt-1 mb-2">
            Maybe later
          </button>
        </div>
      </div>
      <TrustBar items={['Genuine products', 'Fast delivery in Goa', 'Installation support']} />
    </div>
  );
}

// ─── SERVICES popup (all other pages) ────────────────────────────────────────
function ServicesPopup({ onDismiss }: { onDismiss: () => void }) {
  const { mm, ss } = useCountdown(true, 15);

  return (
    <div className="relative z-10 w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-[#080d17] shadow-2xl shadow-black/60">
      <CloseBtn onClick={onDismiss} />
      <div className="grid lg:grid-cols-[1fr_1.1fr]">
        {/* Left */}
        <div className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-cyan-600 via-violet-700 to-pink-600 p-7">
          <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-pink-400/20 blur-3xl" />
          <div className="flex items-center gap-2.5 relative z-10">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm border border-white/30">
              <Image src="/brand.png" alt="TecBunny" width={28} height={28} className="h-6 w-6 object-contain" />
            </div>
            <span className="font-tech font-bold text-lg text-white tracking-wider">TECBUNNY<span className="text-white/60">.</span></span>
          </div>
          <div className="relative z-10 mt-6">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white/90 mb-4">
              <Sparkles className="h-3 w-3" /> Limited Time Offer
            </div>
            <h2 className="text-2xl font-extrabold leading-tight text-white sm:text-3xl">
              Free Site Survey<br />
              <span className="text-white/75 text-xl font-semibold">for any installation</span>
            </h2>
            <p className="mt-3 text-sm text-white/70 leading-relaxed">
              Book a consultation and get a complimentary on-site assessment for CCTV, automation, or IT.
            </p>
          </div>
          <div className="relative z-10 mt-6">
            <p className="text-[11px] text-white/60 uppercase tracking-widest mb-2">Offer expires in</p>
            <div className="flex items-center gap-2">
              {[mm, ss].map((unit, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex h-12 w-12 flex-col items-center justify-center rounded-xl bg-black/30 backdrop-blur-sm border border-white/15">
                    <span className="text-xl font-black text-white tabular-nums leading-none">{unit}</span>
                    <span className="text-[9px] text-white/50 uppercase mt-0.5">{i === 0 ? 'min' : 'sec'}</span>
                  </div>
                  {i === 0 && <span className="text-xl font-bold text-white/40">:</span>}
                </div>
              ))}
            </div>
          </div>
          <a href="tel:+919604136010" className="relative z-10 mt-6 inline-flex items-center gap-2 text-xs text-white/70 hover:text-white transition">
            <Phone className="h-3.5 w-3.5" /> +91 96041 36010
          </a>
        </div>
        {/* Right */}
        <div className="flex flex-col p-7">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">What we do</p>
          <ul className="space-y-2.5 mb-6">
            {coreServices.map(({ icon: Icon, label, color, dot }) => (
              <li key={label} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${color}`}>
                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dot}`} />
                <Icon className="h-4 w-4 shrink-0" />
                <span className="text-sm font-semibold">{label}</span>
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-3 gap-2 mb-6">
            {[{ val: '100+', lbl: 'Installs' }, { val: '5★', lbl: 'Rated' }, { val: 'Goa', lbl: 'Based' }].map(({ val, lbl }) => (
              <div key={lbl} className="flex flex-col items-center rounded-xl bg-white/[0.04] border border-white/5 py-3">
                <span className="text-base font-black text-white">{val}</span>
                <span className="text-[10px] text-slate-500 mt-0.5">{lbl}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2 mt-auto">
            <Link href="/contact" onClick={onDismiss}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-500/20 transition-transform hover:scale-[1.02]">
              Claim Free Survey <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/services" onClick={onDismiss}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-6 py-2.5 text-sm text-slate-400 transition hover:text-white hover:border-white/20">
              Browse All Services
            </Link>
            <button onClick={onDismiss} className="text-[11px] text-slate-600 hover:text-slate-400 transition mt-1">
              No thanks, I&apos;ll skip this
            </button>
          </div>
        </div>
      </div>
      <TrustBar items={['Professional Installation', 'After-Sales Support', "Goa's Trusted Tech Partner"]} />
    </div>
  );
}

// ─── Root component ────────────────────────────────────────────────────────────
export default function MarketingPopup() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const popupType = resolvePopupType(pathname);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const key = storageKey(popupType);
      const stored = localStorage.getItem(key);
      const shouldShow = !stored || Date.now() - parseInt(stored, 10) > SHOW_INTERVAL_MS;
      if (shouldShow) timer = setTimeout(() => setVisible(true), 2500);
    } catch {
      timer = setTimeout(() => setVisible(true), 2500);
    }
    return () => { if (timer !== undefined) clearTimeout(timer); };
  }, [mounted, popupType]);

  const dismiss = () => {
    try { localStorage.setItem(storageKey(popupType), String(Date.now())); } catch { /* ignore */ }
    setVisible(false);
  };

  if (!mounted || !visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6"
      role="dialog" aria-modal="true" aria-label="TecBunny Popup">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={dismiss} aria-hidden="true" />
      {popupType === 'home'     && <HomePopup     onDismiss={dismiss} />}
      {popupType === 'products' && <ProductsPopup onDismiss={dismiss} />}
      {popupType === 'services' && <ServicesPopup onDismiss={dismiss} />}
    </div>
  );
}
