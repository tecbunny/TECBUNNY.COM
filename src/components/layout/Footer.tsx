'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';

import { Facebook, Twitter, Instagram, Linkedin, Youtube, Globe, FileText, Shield } from 'lucide-react';

import { createClient } from '../../lib/supabase/client';
import { logger } from '../../lib/logger';
import { useAnalytics } from '../../hooks/use-analytics';

function WhatsAppIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            height="1em"
            width="1em"
            {...props}
        >
            <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2m.01 1.67c4.56 0 8.25 3.69 8.25 8.25 0 4.56-3.69 8.25-8.25 8.25-1.53 0-3-.42-4.29-1.19l-.3-.18-3.18.83.85-3.11-.2-.32a8.182 8.182 0 0 1-1.25-4.38c0-4.56 3.69-8.25 8.25-8.25M9.42 7.72l-.12.02c-.15.03-.3.06-.44.09-.15.03-.28.06-.41.1-.39.12-.76.3-1.09.56-.33.27-.63.6-.88.97-.27.41-.43.85-.43 1.32 0 .5.16.98.48 1.41.32.43.72.84 1.2 1.24.48.4 1 1.03 1.63 1.28.63.25 1.22.4 1.84.4.45 0 .86-.08 1.23-.25.37-.17.63-.38.83-.63.2-.25.32-.54.4-.85.08-.31.13-.64.13-1s-.05-.72-.13-1.03c-.08-.31-.2-.59-.4-.84-.2-.25-.46-.46-.83-.63-.37-.17-.78-.25-1.23-.25-.62 0-1.21.15-1.84.4-.05.02-.1.04-.15.07-.1.03-.18.07-.27.1-.1.03-.18.05-.28.07l-.17.04c-.06.01-.1.02-.12.02-.02 0-.04.01-.06.01-.02 0-.03 0-.03-.01s0-.01 0-.01l-.01-.01c0-.01.01-.02.01-.04 0-.02 0-.04.01-.06.01-.02.01-.04.02-.06a.7.7 0 0 1 .05-.12c.04-.08.08-.15.14-.23.06-.08.12-.15.2-.22.07-.07.15-.14.23-.2.08-.06.16-.12.25-.17.09-.05.18-.09.28-.13.05-.02.1-.04.13-.05.28-.11.53-.17.75-.17.22 0 .43.03.62.09.19.06.37.14.53.25.16.11.3.25.41.41s.19.34.24.54c.05.2.07.4.07.61 0 .02 0 .03 0 .03s0 .02 0 .02l-.01.03c0 .01-.01.02-.01.03 0 .01-.01.02-.02.03-.01.01-.02.02-.04.03l-.05.03-.06.03c-.02.01-.05.02-.08.03-.03.01-.06.02-.1.04-.04.01-.07.02-.11.04-.04.01-.07.03-.11.04-.04.02-.07.03-.1.05s-.07.04-.1.06-.06.04-.1.07c-.03.02-.06.04-.1.07l-.07.05c-.01 0-.01.01-.01.01s0 .01 0 .01l.01.01c.22-.12.44-.24.67-.35.23-.11.45-.24.67-.35.22-.11.44-.22.65-.33.21-.11.42-.22.62-.33l.2-.1c.14-.07.26-.15.39-.22.13-.07.25-.15.36-.24.11-.09.22-.18.31-.29s.18-.23.25-.36a2.64 2.64 0 0 0 .28-1.38c0-.52-.13-1-.39-1.44a3.17 3.17 0 0 0-1.08-1.21c-.4-.33-.86-.57-1.36-.72s-1.02-.22-1.56-.22c-.54 0-1.06.07-1.56.22s-.96.39-1.36.72c-.4.34-.72.75-.97 1.21-.25.46-.38.96-.38 1.51 0 .42.09.82.26 1.17.17.35.4.66.68.92.28.26.59.47.92.62.33.15.68.25 1.04.28h.1c.02 0 .03 0 .03-.01s0-.01 0-.01l-.01-.01c0-.01 0-.01.01-.02l.01-.02c0-.01.01-.02.01-.03l.01-.03c.01-.02.01-.03.01-.05 0-.02 0-.04.01-.06 0-.02.01-.04.01-.06a.71.71 0 0 0 0-.1c0-.04 0-.08-.02-.13s-.04-.1-.07-.15a.43.43 0 0 0-.1-.13c-.04-.04-.08-.08-.13-.11-.05-.03-.1-.06-.17-.08-.07-.02-.13-.04-.2-.06-.07-.02-.15-.03-.22-.04-.04-.01-.07-.01-.11-.02l-.11-.02h-.04z" />
        </svg>
    );
}

export function Footer() {
  const [companyInfo, setCompanyInfo] = React.useState<{supportEmail?: string; supportPhone?: string; registeredAddress?: string}>({});
  const [socialLinks, setSocialLinks] = React.useState<Record<string, string>>({});
  const [subscribeEmail, setSubscribeEmail] = React.useState('');
  const [subscribeStatus, setSubscribeStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [subscribeMessage, setSubscribeMessage] = React.useState<string | null>(null);
  const isMountedRef = React.useRef(true);
  const subscribeAbortRef = React.useRef<AbortController | null>(null);
  const supabase = React.useMemo(() => createClient(), []);
  const { trackEvent } = useAnalytics();

  React.useEffect(() => {
    isMountedRef.current = true;
    fetch('/company-info.json')
      .then(r => r.ok ? r.json() : null)
      .then(data => data && setCompanyInfo(data))
      .catch(() => {});

    return () => {
      isMountedRef.current = false;
      subscribeAbortRef.current?.abort();
    };
  }, []);

  const handleSocialClick = (platform: string) => {
    trackEvent('social_click', { platform });
  };

  const handleSubscribe = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = subscribeEmail.trim().toLowerCase();

    if (!email || !/.+@.+\..+/.test(email)) {
      setSubscribeStatus('error');
      setSubscribeMessage('Please enter a valid email address.');
      return;
    }

    if (!isMountedRef.current) return;
    setSubscribeStatus('loading');
    setSubscribeMessage(null);

    try {
      subscribeAbortRef.current?.abort();
      const controller = new AbortController();
      subscribeAbortRef.current = controller;

      const response = await fetch('/api/contact-messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          name: 'Newsletter Subscriber',
          email,
          subject: 'System Updates Subscription',
          message: 'Please subscribe me to system updates and product announcements.',
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Subscription failed. Please try again later.';
        try {
          const data = await response.json();
          if (typeof data?.error === 'string') {
            errorMessage = data.error;
          }
        } catch (parseError) {
          logger.warn('footer_subscribe_response_parse_failed', {
            error: parseError instanceof Error ? parseError.message : String(parseError),
          });
        }
        throw new Error(errorMessage);
      }

      trackEvent('newsletter_subscribe', { status: 'success' });
      if (!isMountedRef.current) return;
      setSubscribeStatus('success');
      setSubscribeMessage('You are subscribed! We will keep you updated.');
      setSubscribeEmail('');
    } catch (error) {
      if (!isMountedRef.current) return;
      trackEvent('newsletter_subscribe', { status: 'error' });
      logger.error('footer_subscribe_failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      setSubscribeStatus('error');
      setSubscribeMessage(error instanceof Error ? error.message : 'Subscription failed.');
    }
  };

  React.useEffect(() => {
    const loadSocialLinks = async () => {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('key, value')
          .in('key', [
            'facebookUrl',
            'twitterUrl',
            'instagramUrl',
            'linkedinUrl',
            'youtubeUrl',
            'websiteUrl',
          ]);

        if (error) {
          logger.error('Footer: failed to load social media links', { error });
          return;
        }

        const links: Record<string, string> = {};
        data?.forEach((setting) => {
          if (setting.value) {
            links[setting.key] = setting.value as string;
          }
        });

        setSocialLinks(links);
      } catch (error) {
        logger.error('Footer: unexpected error while loading social media links', { error });
      }
    };

    loadSocialLinks();
  }, [supabase]);

  const supportEmail = companyInfo.supportEmail || 'support@tecbunny.com';
  const supportPhone = companyInfo.supportPhone || '+1234567890';
  const address = companyInfo.registeredAddress || undefined;

  const socialPlatforms = React.useMemo(
    () => [
      { key: 'facebookUrl', icon: Facebook, label: 'Facebook' },
      { key: 'instagramUrl', icon: Instagram, label: 'Instagram' },
      { key: 'twitterUrl', icon: Twitter, label: 'Twitter' },
      { key: 'linkedinUrl', icon: Linkedin, label: 'LinkedIn' },
      { key: 'youtubeUrl', icon: Youtube, label: 'YouTube' },
      { key: 'websiteUrl', icon: Globe, label: 'Website' },
    ],
    []
  );

  const activeSocialPlatforms = socialPlatforms.filter(({ key }) => Boolean(socialLinks[key]));

  return (
    <footer className="footer-custom relative overflow-hidden bg-[#030712] border-t border-white/8 pt-8 pb-5 font-sans">
      <div className="pointer-events-none absolute top-0 right-0 h-40 w-40 rounded-full bg-brand-purple/5 blur-[70px]" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Brand row */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-6 border-b border-white/5">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/40 bg-white shadow-[0_0_12px_rgba(6,182,212,0.2)] transition-all group-hover:shadow-[0_0_18px_rgba(6,182,212,0.3)]">
              <Image src="/brand.png" alt="TecBunny Solutions" width={32} height={32} className="h-7 w-7 object-contain" />
            </div>
            <span className="font-tech font-bold text-xl text-white tracking-wide">
              TECBUNNY<span className="text-brand-cyan">.</span>
            </span>
          </Link>
          <p className="text-slate-500 text-xs max-w-xs">
            Goa&apos;s trusted partner for CCTV, home automation, IT &amp; RFID solutions.
          </p>
        </div>

        {/* Links + Newsletter grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-6">

          {/* Services */}
          <div>
            <h4 className="text-brand-cyan text-[10px] font-bold uppercase tracking-widest mb-3">Services</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><Link href="/services" className="hover:text-white transition-colors">CCTV Installation</Link></li>
              <li><Link href="/services" className="hover:text-white transition-colors">Home Automation</Link></li>
              <li><Link href="/services" className="hover:text-white transition-colors">IT Services</Link></li>
              <li><Link href="/services" className="hover:text-white transition-colors">RFID Locks &amp; Cards</Link></li>
              <li><Link href="/webdev" className="hover:text-white transition-colors">Web Development</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-brand-cyan text-[10px] font-bold uppercase tracking-widest mb-3">Company</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/about/business-info" className="hover:text-white transition-colors">Business Info</Link></li>
              <li><Link href="/offers" className="hover:text-white transition-colors">Offers</Link></li>
              <li><Link href="/products" className="hover:text-white transition-colors">Products</Link></li>
              <li><Link href="/info/policies/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/info/policies/terms" className="hover:text-white transition-colors">Terms</Link></li>
              <li><Link href="/info/policies/return" className="hover:text-white transition-colors">Return Policy</Link></li>
              <li><Link href="/info/policies/refund-cancellation" className="hover:text-white transition-colors">Refund Policy</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-brand-cyan text-[10px] font-bold uppercase tracking-widest mb-3">Contact Us</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="text-slate-300">{address || 'Goa, India'}</li>
              <li>
                <a href={`tel:${supportPhone.replace(/\s+/g,'')}`} className="hover:text-brand-cyan transition-colors">
                  {supportPhone}
                </a>
              </li>
              <li>
                <a href={`mailto:${supportEmail}`} className="hover:text-brand-cyan transition-colors break-all">
                  {supportEmail}
                </a>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-brand-cyan text-[10px] font-bold uppercase tracking-widest mb-3">Newsletter</h4>
            <form className="flex flex-col gap-2" onSubmit={handleSubscribe}>
              <input
                type="email"
                placeholder="Your email"
                value={subscribeEmail}
                onChange={(event) => {
                  setSubscribeEmail(event.target.value);
                  if (subscribeStatus !== 'idle') {
                    setSubscribeStatus('idle');
                    setSubscribeMessage(null);
                  }
                }}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-cyan/50 placeholder-slate-600 w-full"
              />
              <button
                type="submit"
                disabled={subscribeStatus === 'loading'}
                className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-brand-cyan hover:text-brand-dark hover:border-brand-cyan text-white text-xs font-bold font-tech rounded-lg transition-all duration-300"
              >
                {subscribeStatus === 'loading' ? 'SUBSCRIBING...' : 'SUBSCRIBE'}
              </button>
            </form>
            {subscribeMessage && (
              <p className={`mt-2 text-[10px] ${subscribeStatus === 'success' ? 'text-emerald-300' : 'text-rose-300'}`} role="status" aria-live="polite">
                {subscribeMessage}
              </p>
            )}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-5 border-t border-white/5 text-[11px] text-slate-500">
          <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-4 text-center">
            <p>© 2026 TecBunny Solutions. All rights reserved.</p>
            <p className="font-mono">CIN: U80200GA2025PTC017488</p>
          </div>
          {activeSocialPlatforms.length > 0 && (
            <div className="flex gap-4">
              {activeSocialPlatforms.map(({ key, icon: Icon, label }) => (
                <a key={key} href={socialLinks[key]} target="_blank" rel="noopener noreferrer"
                  className="hover:text-brand-cyan transition-colors" onClick={() => handleSocialClick(label)}>
                  <Icon className="h-4 w-4" />
                  <span className="sr-only">{label}</span>
                </a>
              ))}
            </div>
          )}
        </div>

      </div>
    </footer>
  );
}