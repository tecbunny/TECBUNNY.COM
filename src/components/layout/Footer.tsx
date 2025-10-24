'use client';

import * as React from 'react';
import Link from 'next/link';

import { Facebook, Twitter, Instagram, Linkedin, Youtube, Globe } from 'lucide-react';

import { Button } from '../../components/ui/enhanced-ui';
import { Input } from '../../components/ui/enhanced-ui';
import { Logo } from '../../components/ui/logo';
import { createClient } from '../../lib/supabase/client';
import { logger } from '../../lib/logger';

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
  const supabase = React.useMemo(() => createClient(), []);

  React.useEffect(() => {
    fetch('/company-info.json')
      .then(r => r.ok ? r.json() : null)
      .then(data => data && setCompanyInfo(data))
      .catch(() => {});
  }, []);

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
    <footer className="footer-custom">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
          
          <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center gap-2">
                 <Logo className="h-8 w-8 text-blue-400" />
                 <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-400 bg-clip-text text-transparent">TecBunny</span>
              </div>
              <p className="text-gray-300 text-lg leading-relaxed">Your friendly neighborhood tech store, bringing you the latest gadgets and accessories with style and innovation.</p>
              {address && (
                <p className="text-gray-400 text-sm">{address}</p>
              )}
              <div>
                <h4 className="font-semibold mb-4 text-blue-300 text-lg">Stay in the loop</h4>
                 <div className="flex w-full max-w-sm items-center gap-3">
                    <Input type="email" placeholder="Enter your email" className="bg-gray-800/80 text-white placeholder:text-gray-400 border-gray-600 focus:border-blue-400 flex-1" />
                    <Button variant="gradient" size="default" className="shadow-button">Subscribe</Button>
                </div>
              </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-blue-300">Quick Links</h4>
            <nav className="flex flex-col gap-2">
              <Link href="/" className="text-gray-300 hover:text-blue-400 transition-colors">Home</Link>
              <Link href="/products" className="text-gray-300 hover:text-blue-400 transition-colors">Products</Link>
              <Link href="/services" className="text-gray-300 hover:text-blue-400 transition-colors">Services</Link>
              <Link href="/offers" className="text-gray-300 hover:text-blue-400 transition-colors">Offers</Link>
            </nav>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-blue-300">Company</h4>
            <nav className="flex flex-col gap-2">
              <Link href="/about" className="text-gray-300 hover:text-blue-400 transition-colors">About Us</Link>
              <Link href="/about/business-info" className="text-gray-300 hover:text-blue-400 transition-colors">Business Info</Link>
              <Link href="/contact" className="text-gray-300 hover:text-blue-400 transition-colors">Contact</Link>
              <Link href="/info/policies/privacy" className="text-gray-300 hover:text-blue-400 transition-colors">Privacy Policy</Link>
              <Link href="/info/policies/terms" className="text-gray-300 hover:text-blue-400 transition-colors">Terms of Service</Link>
              <Link href="/info/policies/return" className="text-gray-300 hover:text-blue-400 transition-colors">Return Policy</Link>
              <Link href="/info/policies/shipping" className="text-gray-300 hover:text-blue-400 transition-colors">Shipping Policy</Link>
              <Link href="/info/policies/refund-cancellation" className="text-gray-300 hover:text-blue-400 transition-colors">Refund & Cancellation</Link>
            </nav>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-blue-300">Support</h4>
            <nav className="flex flex-col gap-2">
              <a href={`mailto:${supportEmail}`} className="text-gray-300 hover:text-blue-400 transition-colors">Help Center</a>
              <a href={`tel:${supportPhone.replace(/\s+/g,'')}`} className="text-gray-300 hover:text-blue-400 transition-colors">Call Support</a>
              <a href={`https://wa.me/${supportPhone.replace(/\D/g,'')}`} className="text-gray-300 hover:text-blue-400 transition-colors">WhatsApp</a>
              <Link href="/management" className="text-gray-300 hover:text-blue-400 transition-colors">Staff Portal</Link>
            </nav>
          </div>

          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-blue-300">Connect</h4>
            {activeSocialPlatforms.length > 0 ? (
              <div className="flex gap-4 flex-wrap">
                {activeSocialPlatforms.map(({ key, icon: Icon, label }) => (
                  <a
                    key={key}
                    href={socialLinks[key]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-300 hover:text-blue-400 transition-all duration-300 hover:scale-110"
                  >
                    <Icon className="h-6 w-6" />
                    <span className="sr-only">{label}</span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                Social media links will appear here once they&apos;re configured.
              </p>
            )}
            {supportPhone && (
              <a
                href={`https://wa.me/${supportPhone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-gray-300 hover:text-blue-400 transition-colors"
              >
                <WhatsAppIcon className="h-5 w-5" />
                <span className="text-sm">Chat with us on WhatsApp</span>
              </a>
            )}
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-blue-200/30">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-gray-300 text-center sm:text-left">
              © 2025 TecBunny. All rights reserved. Built with ❤️ and innovation.
            </p>
            <div className="flex gap-6 text-sm">
              <Link href="/info/policies/privacy" className="text-gray-300 hover:text-blue-400 transition-colors">Privacy Policy</Link>
              <Link href="/info/policies/terms" className="text-gray-300 hover:text-blue-400 transition-colors">Terms</Link>
              <Link href="/info/policies/return" className="text-gray-300 hover:text-blue-400 transition-colors">Returns</Link>
              <Link href="/info/policies/shipping" className="text-gray-300 hover:text-blue-400 transition-colors">Shipping</Link>
              <Link href="/info/policies/refund-cancellation" className="text-gray-300 hover:text-blue-400 transition-colors">Refunds</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}