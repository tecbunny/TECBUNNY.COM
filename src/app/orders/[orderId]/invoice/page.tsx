import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { InvoiceTemplate, type CompanySettings } from '@/components/invoices/InvoiceTemplate';
import type { Order } from '@/lib/types';
import { createServiceClient } from '@/lib/supabase/server';
import { deserializeOrder } from '@/lib/orders/normalizers';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface InvoicePageProps {
  params: { orderId: string };
  searchParams?: Record<string, string | string[] | undefined>;
}

const COMPANY_INFO_PATH = path.join(process.cwd(), 'public', 'company-info.json');

const FALLBACK_COMPANY_SETTINGS: CompanySettings = {
  name: 'TecBunny Solutions',
  address: 'H NO 11 NHAYGINWADA, PARSE, Parxem, Pernem, North Goa- 403512, Goa',
  gstin: '30AAMCT1608G1ZO',
  pan: 'AAMCT1608G',
  tan: 'BLRT25863F',
  cin: 'U80200GA2025PTC017488',
  supportEmail: 'support@tecbunny.com',
  supportPhone: '+91 94296 94995',
};

async function loadOrder(orderId: string): Promise<Order | null> {
  const supabase = createServiceClient();
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error || !data) {
      if (error) {
        logger.warn('Invoice page failed to load order', { orderId, error: error.message });
      }
      return null;
    }

    return deserializeOrder(data);
  } catch (error) {
    logger.error('Invoice page encountered an unexpected error while fetching order', {
      orderId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

async function loadCompanySettings(): Promise<CompanySettings> {
  try {
    const raw = await fs.readFile(COMPANY_INFO_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    return {
      ...FALLBACK_COMPANY_SETTINGS,
      name: typeof parsed.companyName === 'string' ? parsed.companyName : FALLBACK_COMPANY_SETTINGS.name,
      address: typeof parsed.registeredAddress === 'string' ? parsed.registeredAddress : FALLBACK_COMPANY_SETTINGS.address,
      gstin: typeof parsed.gstin === 'string' ? parsed.gstin : FALLBACK_COMPANY_SETTINGS.gstin,
      pan: typeof parsed.pan === 'string' ? parsed.pan : FALLBACK_COMPANY_SETTINGS.pan,
      tan: typeof parsed.tan === 'string' ? parsed.tan : FALLBACK_COMPANY_SETTINGS.tan,
      cin: typeof parsed.cin === 'string' ? parsed.cin : FALLBACK_COMPANY_SETTINGS.cin,
      supportEmail: typeof parsed.supportEmail === 'string' ? parsed.supportEmail : FALLBACK_COMPANY_SETTINGS.supportEmail,
      supportPhone: typeof parsed.supportPhone === 'string' ? parsed.supportPhone : FALLBACK_COMPANY_SETTINGS.supportPhone,
    };
  } catch (error) {
    logger.warn('Invoice page falling back to default company settings', {
      error: error instanceof Error ? error.message : String(error),
    });
    return FALLBACK_COMPANY_SETTINGS;
  }
}

export async function generateMetadata({ params }: InvoicePageProps): Promise<Metadata> {
  const shortId = params.orderId?.slice(0, 8)?.toUpperCase() ?? 'Invoice';
  return {
    title: `Invoice ${shortId} | TecBunny Solutions`,
    description: `Download a professionally formatted invoice for order ${shortId}.`,
  };
}

export default async function OrderInvoicePage({ params, searchParams }: InvoicePageProps) {
  const order = await loadOrder(params.orderId);

  if (!order) {
    notFound();
  }

  const settings = await loadCompanySettings();
  const printParam = searchParams?.print;
  const shouldAutoPrint = Array.isArray(printParam)
    ? printParam.some(value => value === '1' || value === 'true')
    : printParam === '1' || printParam === 'true';

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4 print:bg-white print:py-0">
      <div className="max-w-5xl mx-auto">
        <InvoiceTemplate order={order} settings={settings} autoPrint={shouldAutoPrint} />
      </div>
    </div>
  );
}
