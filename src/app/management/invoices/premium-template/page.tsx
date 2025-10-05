import { Metadata } from 'next';

import PremiumInvoiceTemplate from '../../../../components/invoices/PremiumInvoiceTemplate';

export const metadata: Metadata = {
  title: 'Premium Invoice Generator | TecBunny Store',
  description: 'Create professional invoices with our premium invoice template. GST compliant for Indian businesses.',
  keywords: ['invoice', 'billing', 'GST', 'premium template', 'business'],
};

export default function InvoiceGeneratorPage() {
  return <PremiumInvoiceTemplate />;
}