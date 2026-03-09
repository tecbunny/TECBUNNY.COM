'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CheckCircle2, Loader2, Send } from 'lucide-react';

import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

// ─── Shared base schema ────────────────────────────────────────────────────────
const baseSchema = {
  name:  z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email address'),
  phone: z.string().min(10, 'Enter a valid phone number'),
};

// ─── Shared input primitives ───────────────────────────────────────────────────
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</label>
      {children}
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
}

const inputCls = 'w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none transition';
const selectCls = 'w-full rounded-xl border border-white/10 bg-[#0d1421] px-4 py-2.5 text-sm text-white focus:border-cyan-500/50 focus:outline-none transition appearance-none';

function SubmitBtn({ loading }: { loading: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-500/20 transition-transform hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      {loading ? 'Submitting…' : 'Send Request'}
    </button>
  );
}

function SuccessBanner({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-10 text-center">
      <CheckCircle2 className="h-12 w-12 text-emerald-400" />
      <div>
        <h3 className="text-lg font-bold text-white">Request Submitted!</h3>
        <p className="mt-1 text-sm text-slate-400">We'll reach out within 24 hours to discuss your requirements.</p>
      </div>
      <button onClick={onReset} className="text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition">
        Submit another request
      </button>
    </div>
  );
}

// ─── Shared submit helper ─────────────────────────────────────────────────────
async function submitRequest(payload: { name: string; email: string; phone: string; subject: string; message: string }) {
  const res = await fetch('/api/contact-messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => null);
    throw new Error(typeof d?.error === 'string' ? d.error : 'Failed to submit. Please try again.');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. CCTV
// ═══════════════════════════════════════════════════════════════════════════════
const cctvSchema = z.object({
  ...baseSchema,
  property_type: z.enum(['home', 'office', 'shop', 'warehouse', 'other']),
  camera_count: z.string().min(1, 'Select camera count'),
  area_sqft: z.string().optional(),
  has_existing: z.enum(['yes', 'no', 'partial']),
  preferred_date: z.string().optional(),
  message: z.string().optional(),
});
type CctvValues = z.infer<typeof cctvSchema>;

export function CctvRequestForm() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const { register, handleSubmit, formState: { errors }, reset } = useForm<CctvValues>({ resolver: zodResolver(cctvSchema) });

  const onSubmit = async (v: CctvValues) => {
    setLoading(true);
    try {
      const details = [
        `Property type: ${v.property_type}`,
        `Cameras needed: ${v.camera_count}`,
        v.area_sqft ? `Area: ${v.area_sqft} sq ft` : null,
        `Existing system: ${v.has_existing}`,
        v.preferred_date ? `Preferred site visit: ${v.preferred_date}` : null,
        v.message ? `\nAdditional notes: ${v.message}` : null,
      ].filter(Boolean).join('\n');
      await submitRequest({ name: v.name, email: v.email, phone: v.phone, subject: 'CCTV Installation Request', message: details });
      setDone(true);
    } catch (err) {
      logger.error('cctv_request_failed', { error: err instanceof Error ? err.message : String(err) });
      toast({ variant: 'destructive', title: 'Submission failed', description: err instanceof Error ? err.message : 'Unexpected error' });
    } finally { setLoading(false); }
  };

  if (done) return <SuccessBanner onReset={() => { setDone(false); reset(); }} />;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Full Name" error={errors.name?.message}><input {...register('name')} placeholder="Your name" className={inputCls} /></Field>
        <Field label="Email" error={errors.email?.message}><input {...register('email')} type="email" placeholder="you@example.com" className={inputCls} /></Field>
        <Field label="Phone" error={errors.phone?.message}><input {...register('phone')} placeholder="+91 XXXXX XXXXX" className={inputCls} /></Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Property Type" error={errors.property_type?.message}>
          <select {...register('property_type')} className={selectCls}>
            <option value="">Select…</option>
            <option value="home">Residential / Home</option>
            <option value="office">Office</option>
            <option value="shop">Shop / Retail</option>
            <option value="warehouse">Warehouse / Industrial</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="Number of Cameras" error={errors.camera_count?.message}>
          <select {...register('camera_count')} className={selectCls}>
            <option value="">Select…</option>
            {['1–2', '3–4', '5–8', '9–16', '17–32', '32+'].map(o => <option key={o} value={o}>{o} cameras</option>)}
          </select>
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Area (sq ft, approx)" error={errors.area_sqft?.message}><input {...register('area_sqft')} placeholder="e.g. 1200" className={inputCls} /></Field>
        <Field label="Existing CCTV System?" error={errors.has_existing?.message}>
          <select {...register('has_existing')} className={selectCls}>
            <option value="">Select…</option>
            <option value="no">No — fresh install</option>
            <option value="partial">Partial — needs upgrade</option>
            <option value="yes">Yes — replacement / expansion</option>
          </select>
        </Field>
        <Field label="Preferred Site Visit Date"><input {...register('preferred_date')} type="date" className={inputCls} /></Field>
      </div>
      <Field label="Additional Requirements"><textarea {...register('message')} rows={3} placeholder="Specific locations, night vision, outdoor cameras…" className={inputCls} /></Field>
      <SubmitBtn loading={loading} />
    </form>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Home Automation
// ═══════════════════════════════════════════════════════════════════════════════
const AUTOMATION_ITEMS = ['Lights / Switches', 'Air Conditioning', 'Curtains / Blinds', 'Door Locks', 'Security / Alarm', 'TV / Entertainment', 'Water / Irrigation'];

const haSchema = z.object({
  ...baseSchema,
  property_type: z.enum(['apartment', 'villa', 'office', 'hotel', 'other']),
  rooms: z.string().min(1, 'Required'),
  budget_range: z.enum(['below_50k', '50k_1l', '1l_3l', 'above_3l']),
  automation_items: z.array(z.string()).min(1, 'Select at least one'),
  message: z.string().optional(),
});
type HaValues = z.infer<typeof haSchema>;

export function HomeAutomationRequestForm() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [checkedItems, setCheckedItems] = React.useState<string[]>([]);
  const { register, handleSubmit, setValue, formState: { errors }, reset } = useForm<HaValues>({ resolver: zodResolver(haSchema), defaultValues: { automation_items: [] } });

  const toggle = (item: string) => {
    const updated = checkedItems.includes(item) ? checkedItems.filter(i => i !== item) : [...checkedItems, item];
    setCheckedItems(updated);
    setValue('automation_items', updated, { shouldValidate: true });
  };

  const onSubmit = async (v: HaValues) => {
    setLoading(true);
    try {
      const details = [
        `Property: ${v.property_type}`,
        `Rooms: ${v.rooms}`,
        `Budget: ${v.budget_range.replace(/_/g, ' ')}`,
        `Automate: ${v.automation_items.join(', ')}`,
        v.message ? `\nNotes: ${v.message}` : null,
      ].filter(Boolean).join('\n');
      await submitRequest({ name: v.name, email: v.email, phone: v.phone, subject: 'Home Automation Request', message: details });
      setDone(true);
    } catch (err) {
      logger.error('ha_request_failed', { error: err instanceof Error ? err.message : String(err) });
      toast({ variant: 'destructive', title: 'Submission failed', description: err instanceof Error ? err.message : 'Unexpected error' });
    } finally { setLoading(false); }
  };

  if (done) return <SuccessBanner onReset={() => { setDone(false); reset(); setCheckedItems([]); }} />;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Full Name" error={errors.name?.message}><input {...register('name')} placeholder="Your name" className={inputCls} /></Field>
        <Field label="Email" error={errors.email?.message}><input {...register('email')} type="email" placeholder="you@example.com" className={inputCls} /></Field>
        <Field label="Phone" error={errors.phone?.message}><input {...register('phone')} placeholder="+91 XXXXX XXXXX" className={inputCls} /></Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Property Type" error={errors.property_type?.message}>
          <select {...register('property_type')} className={selectCls}>
            <option value="">Select…</option>
            {['apartment', 'villa', 'office', 'hotel', 'other'].map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
          </select>
        </Field>
        <Field label="Number of Rooms" error={errors.rooms?.message}><input {...register('rooms')} placeholder="e.g. 3" className={inputCls} /></Field>
        <Field label="Budget Range" error={errors.budget_range?.message}>
          <select {...register('budget_range')} className={selectCls}>
            <option value="">Select…</option>
            <option value="below_50k">Below ₹50,000</option>
            <option value="50k_1l">₹50,000 – ₹1 Lakh</option>
            <option value="1l_3l">₹1 Lakh – ₹3 Lakh</option>
            <option value="above_3l">Above ₹3 Lakh</option>
          </select>
        </Field>
      </div>
      <Field label="What to automate?" error={errors.automation_items?.message}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {AUTOMATION_ITEMS.map(item => (
            <button key={item} type="button" onClick={() => toggle(item)}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${checkedItems.includes(item) ? 'border-violet-400/50 bg-violet-500/20 text-violet-200' : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-white'}`}>
              {item}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Additional Notes"><textarea {...register('message')} rows={3} placeholder="Voice control, specific brands, existing wiring…" className={inputCls} /></Field>
      <SubmitBtn loading={loading} />
    </form>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. IT Services
// ═══════════════════════════════════════════════════════════════════════════════
const itSchema = z.object({
  ...baseSchema,
  service_type: z.enum(['repair', 'networking', 'server', 'amc', 'data_recovery', 'other']),
  device_count: z.string().optional(),
  os_platform: z.enum(['windows', 'mac', 'linux', 'mixed', 'na']),
  urgency: z.enum(['urgent', 'this_week', 'flexible']),
  message: z.string().min(10, 'Please describe the issue (min 10 characters)'),
});
type ItValues = z.infer<typeof itSchema>;

export function ItServicesRequestForm() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const { register, handleSubmit, formState: { errors }, reset } = useForm<ItValues>({ resolver: zodResolver(itSchema) });

  const onSubmit = async (v: ItValues) => {
    setLoading(true);
    try {
      const details = [
        `Service needed: ${v.service_type.replace(/_/g, ' ')}`,
        v.device_count ? `Devices: ${v.device_count}` : null,
        `Platform: ${v.os_platform}`,
        `Urgency: ${v.urgency.replace(/_/g, ' ')}`,
        `\nIssue: ${v.message}`,
      ].filter(Boolean).join('\n');
      await submitRequest({ name: v.name, email: v.email, phone: v.phone, subject: 'IT Services Request', message: details });
      setDone(true);
    } catch (err) {
      logger.error('it_request_failed', { error: err instanceof Error ? err.message : String(err) });
      toast({ variant: 'destructive', title: 'Submission failed', description: err instanceof Error ? err.message : 'Unexpected error' });
    } finally { setLoading(false); }
  };

  if (done) return <SuccessBanner onReset={() => { setDone(false); reset(); }} />;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Full Name" error={errors.name?.message}><input {...register('name')} placeholder="Your name" className={inputCls} /></Field>
        <Field label="Email" error={errors.email?.message}><input {...register('email')} type="email" placeholder="you@example.com" className={inputCls} /></Field>
        <Field label="Phone" error={errors.phone?.message}><input {...register('phone')} placeholder="+91 XXXXX XXXXX" className={inputCls} /></Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Service Type" error={errors.service_type?.message}>
          <select {...register('service_type')} className={selectCls}>
            <option value="">Select…</option>
            <option value="repair">Hardware Repair</option>
            <option value="networking">Networking / Wi-Fi Setup</option>
            <option value="server">Server / NAS Setup</option>
            <option value="amc">AMC (Annual Maintenance)</option>
            <option value="data_recovery">Data Recovery</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="No. of Devices" error={errors.device_count?.message}><input {...register('device_count')} placeholder="e.g. 5 PCs" className={inputCls} /></Field>
        <Field label="OS Platform" error={errors.os_platform?.message}>
          <select {...register('os_platform')} className={selectCls}>
            <option value="">Select…</option>
            <option value="windows">Windows</option>
            <option value="mac">macOS</option>
            <option value="linux">Linux</option>
            <option value="mixed">Mixed</option>
            <option value="na">Not Applicable</option>
          </select>
        </Field>
      </div>
      <Field label="Urgency" error={errors.urgency?.message}>
        <select {...register('urgency')} className={selectCls}>
          <option value="">Select…</option>
          <option value="urgent">Urgent — ASAP</option>
          <option value="this_week">This week</option>
          <option value="flexible">Flexible timing</option>
        </select>
      </Field>
      <Field label="Describe the Issue / Requirements" error={errors.message?.message}><textarea {...register('message')} rows={4} placeholder="What's happening? Error messages, symptoms, what you need…" className={inputCls} /></Field>
      <SubmitBtn loading={loading} />
    </form>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. RFID Locks & Cards
// ═══════════════════════════════════════════════════════════════════════════════
const rfidSchema = z.object({
  ...baseSchema,
  location_type: z.enum(['office', 'hotel', 'home', 'school', 'factory', 'other']),
  door_count: z.string().min(1, 'Required'),
  lock_type: z.enum(['rfid_card', 'rfid_pin', 'biometric', 'combined']),
  custom_cards: z.enum(['yes', 'no']),
  card_count: z.string().optional(),
  message: z.string().optional(),
});
type RfidValues = z.infer<typeof rfidSchema>;

export function RfidRequestForm() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const { register, handleSubmit, formState: { errors }, reset } = useForm<RfidValues>({ resolver: zodResolver(rfidSchema) });

  const onSubmit = async (v: RfidValues) => {
    setLoading(true);
    try {
      const details = [
        `Location: ${v.location_type}`,
        `Doors: ${v.door_count}`,
        `Lock type: ${v.lock_type.replace(/_/g, ' ')}`,
        `Custom RFID cards: ${v.custom_cards}`,
        v.card_count ? `Card quantity: ${v.card_count}` : null,
        v.message ? `\nNotes: ${v.message}` : null,
      ].filter(Boolean).join('\n');
      await submitRequest({ name: v.name, email: v.email, phone: v.phone, subject: 'RFID Locks & Cards Request', message: details });
      setDone(true);
    } catch (err) {
      logger.error('rfid_request_failed', { error: err instanceof Error ? err.message : String(err) });
      toast({ variant: 'destructive', title: 'Submission failed', description: err instanceof Error ? err.message : 'Unexpected error' });
    } finally { setLoading(false); }
  };

  if (done) return <SuccessBanner onReset={() => { setDone(false); reset(); }} />;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Full Name" error={errors.name?.message}><input {...register('name')} placeholder="Your name" className={inputCls} /></Field>
        <Field label="Email" error={errors.email?.message}><input {...register('email')} type="email" placeholder="you@example.com" className={inputCls} /></Field>
        <Field label="Phone" error={errors.phone?.message}><input {...register('phone')} placeholder="+91 XXXXX XXXXX" className={inputCls} /></Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Location Type" error={errors.location_type?.message}>
          <select {...register('location_type')} className={selectCls}>
            <option value="">Select…</option>
            {['office', 'hotel', 'home', 'school', 'factory', 'other'].map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
          </select>
        </Field>
        <Field label="Number of Doors / Access Points" error={errors.door_count?.message}><input {...register('door_count')} placeholder="e.g. 4" className={inputCls} /></Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Lock Type" error={errors.lock_type?.message}>
          <select {...register('lock_type')} className={selectCls}>
            <option value="">Select…</option>
            <option value="rfid_card">RFID Card Only</option>
            <option value="rfid_pin">RFID + PIN</option>
            <option value="biometric">Biometric</option>
            <option value="combined">Combined (RFID + Biometric)</option>
          </select>
        </Field>
        <Field label="Need Custom Designed Cards?" error={errors.custom_cards?.message}>
          <select {...register('custom_cards')} className={selectCls}>
            <option value="">Select…</option>
            <option value="yes">Yes — with company branding</option>
            <option value="no">No — plain cards</option>
          </select>
        </Field>
        <Field label="Card Quantity (approx)"><input {...register('card_count')} placeholder="e.g. 50" className={inputCls} /></Field>
      </div>
      <Field label="Additional Requirements"><textarea {...register('message')} rows={3} placeholder="Multi-floor access, time-based restrictions, visitor management…" className={inputCls} /></Field>
      <SubmitBtn loading={loading} />
    </form>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. Web Development
// ═══════════════════════════════════════════════════════════════════════════════
const webSchema = z.object({
  ...baseSchema,
  website_type: z.enum(['portfolio', 'business', 'ecommerce', 'blog', 'booking', 'webapp', 'other']),
  budget_range: z.enum(['below_15k', '15k_50k', '50k_1l', 'above_1l']),
  timeline: z.enum(['asap', 'within_month', 'within_3months', 'flexible']),
  has_domain: z.enum(['yes', 'no', 'need_help']),
  has_content: z.enum(['yes', 'partial', 'no']),
  message: z.string().optional(),
});
type WebValues = z.infer<typeof webSchema>;

export function WebDevRequestForm() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const { register, handleSubmit, formState: { errors }, reset } = useForm<WebValues>({ resolver: zodResolver(webSchema) });

  const onSubmit = async (v: WebValues) => {
    setLoading(true);
    try {
      const details = [
        `Website type: ${v.website_type}`,
        `Budget: ${v.budget_range.replace(/_/g, ' ')}`,
        `Timeline: ${v.timeline.replace(/_/g, ' ')}`,
        `Has domain/hosting: ${v.has_domain}`,
        `Has content/copy: ${v.has_content}`,
        v.message ? `\nDetails: ${v.message}` : null,
      ].filter(Boolean).join('\n');
      await submitRequest({ name: v.name, email: v.email, phone: v.phone, subject: 'Web Development Request', message: details });
      setDone(true);
    } catch (err) {
      logger.error('webdev_request_failed', { error: err instanceof Error ? err.message : String(err) });
      toast({ variant: 'destructive', title: 'Submission failed', description: err instanceof Error ? err.message : 'Unexpected error' });
    } finally { setLoading(false); }
  };

  if (done) return <SuccessBanner onReset={() => { setDone(false); reset(); }} />;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Full Name" error={errors.name?.message}><input {...register('name')} placeholder="Your name" className={inputCls} /></Field>
        <Field label="Email" error={errors.email?.message}><input {...register('email')} type="email" placeholder="you@example.com" className={inputCls} /></Field>
        <Field label="Phone" error={errors.phone?.message}><input {...register('phone')} placeholder="+91 XXXXX XXXXX" className={inputCls} /></Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Website Type" error={errors.website_type?.message}>
          <select {...register('website_type')} className={selectCls}>
            <option value="">Select…</option>
            <option value="portfolio">Portfolio / Personal</option>
            <option value="business">Business Brochure</option>
            <option value="ecommerce">E-Commerce / Online Store</option>
            <option value="blog">Blog / News</option>
            <option value="booking">Booking / Appointment</option>
            <option value="webapp">Web Application / Dashboard</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="Budget Range" error={errors.budget_range?.message}>
          <select {...register('budget_range')} className={selectCls}>
            <option value="">Select…</option>
            <option value="below_15k">Below ₹15,000</option>
            <option value="15k_50k">₹15,000 – ₹50,000</option>
            <option value="50k_1l">₹50,000 – ₹1 Lakh</option>
            <option value="above_1l">Above ₹1 Lakh</option>
          </select>
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Timeline" error={errors.timeline?.message}>
          <select {...register('timeline')} className={selectCls}>
            <option value="">Select…</option>
            <option value="asap">ASAP</option>
            <option value="within_month">Within 1 month</option>
            <option value="within_3months">Within 3 months</option>
            <option value="flexible">Flexible</option>
          </select>
        </Field>
        <Field label="Domain / Hosting?" error={errors.has_domain?.message}>
          <select {...register('has_domain')} className={selectCls}>
            <option value="">Select…</option>
            <option value="yes">Yes — I have it</option>
            <option value="no">No — please provide</option>
            <option value="need_help">Not sure — need help</option>
          </select>
        </Field>
        <Field label="Website Content Ready?" error={errors.has_content?.message}>
          <select {...register('has_content')} className={selectCls}>
            <option value="">Select…</option>
            <option value="yes">Yes — text & images ready</option>
            <option value="partial">Partial — need copywriting help</option>
            <option value="no">No — need full content creation</option>
          </select>
        </Field>
      </div>
      <Field label="Project Details / Special Requirements"><textarea {...register('message')} rows={4} placeholder="Reference websites, features needed, integrations, design preferences…" className={inputCls} /></Field>
      <SubmitBtn loading={loading} />
    </form>
  );
}
