import type { Metadata } from 'next';

import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Separator } from '../../../../components/ui/separator';

export const metadata: Metadata = {
  title: 'Quotes | Admin',
  description: 'Manage customer quote requests and downloads.',
};

export default function AdminQuotesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Quotes</h1>
        <p className="text-sm text-slate-400">Track and manage customer quote requests.</p>
      </div>
      <Separator className="bg-white/10" />
      <Card className="border-white/10 bg-white/5 text-slate-200">
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-300">
          Admin quote management UI will surface here (list, status, PDF links). For now, this page is a placeholder.
        </CardContent>
      </Card>
    </div>
  );
}
