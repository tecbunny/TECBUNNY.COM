import Link from 'next/link';
import type { Metadata } from 'next';

import { ShieldCheck, Wrench } from 'lucide-react';

import { Button } from '@/components/ui/button';
import CustomSetupFlow from '@/components/customised-setups/CustomSetupFlow';
import { RefreshButton } from '@/components/customised-setups/RefreshButton';
import { DEFAULT_CUSTOM_SETUP_TEMPLATE_SLUG } from '@/lib/custom-setup.constants';
import { getCustomSetupBlueprintSummary } from '@/lib/custom-setup-service';

export const metadata: Metadata = {
  title: 'Customised Setups - TecBunny Store',
  description:
    'Build a CCTV deployment tailored to your site. Select DVR/NVR paths, camera counts, storage, and services to preview TecBunny pricing instantly.',
  openGraph: {
    title: 'Customised Setups | TecBunny',
    description: 'Configure TecBunny surveillance bundles with transparent MRP vs sale pricing.',
    type: 'website',
  },
};

export const dynamic = 'force-dynamic';
export const revalidate = 0; // Force no caching

export default async function CustomisedSetupsPage({
  searchParams,
}: {
  searchParams: { refresh?: string };
}) {
  let blueprint = null;
  try {
    blueprint = await getCustomSetupBlueprintSummary(DEFAULT_CUSTOM_SETUP_TEMPLATE_SLUG);
    console.log('Public page blueprint fetch result:', {
      success: !!blueprint,
      systemCount: blueprint?.systems?.length || 0,
      slug: DEFAULT_CUSTOM_SETUP_TEMPLATE_SLUG,
      timestamp: new Date().toISOString(),
      refreshParam: searchParams.refresh || 'none',
      samplePricing: blueprint?.systems?.[0]?.components?.[0]?.options?.[0] ? {
        label: blueprint.systems[0].components[0].options[0].label,
        unitPrice: blueprint.systems[0].components[0].options[0].unitPrice,
        metadata: blueprint.systems[0].components[0].options[0].metadata
      } : null
    });
  } catch (error) {
    console.error('Failed to fetch blueprint for public page:', error);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white">
      <section className="container mx-auto px-4 pb-12 pt-16 sm:pt-20">
        <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <ShieldCheck className="h-4 w-4" />
            Tailored surveillance deployments
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Customise your TecBunny CCTV setup
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-600">
            Start with your preferred recorder path, adjust the camera count, and include storage or services to generate an indicative proposal. Our solution desk will validate selections before rollout.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/contact">Request a site survey</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="mailto:solutions@tecbunny.com?subject=Customised%20Setup%20Enquiry">Email solutions desk</Link>
            </Button>
            <RefreshButton />
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-16">
        <CustomSetupFlow blueprint={blueprint} />
      </section>

      <section className="bg-slate-900 py-14">
        <div className="container mx-auto flex flex-col gap-8 px-4 text-slate-100 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <h2 className="text-3xl font-semibold text-white">What happens after you share this estimate?</h2>
            <p className="text-slate-300">
              A TecBunny engineer validates cable runs, storage retention, and power plans before scheduling deployment.
              Expect a full bill of materials and implementation timeline within one business day.
            </p>
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="inline-flex items-center gap-2 rounded-md border border-white/30 px-3 py-2">
                <Wrench className="h-4 w-4" /> Certified on-site specialists
              </span>
              <span className="inline-flex items-center gap-2 rounded-md border border-white/30 px-3 py-2">
                <ShieldCheck className="h-4 w-4" /> Compliance-ready hardware choices
              </span>
            </div>
          </div>
          <Button asChild size="lg" variant="secondary">
            <Link href="https://wa.me/919429694995" target="_blank" rel="noreferrer">Chat on WhatsApp</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
