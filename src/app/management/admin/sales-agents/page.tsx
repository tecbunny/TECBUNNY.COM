import { Metadata } from 'next';

import { redirect } from 'next/navigation';

import SalesAgentsManagement from '../../../../components/admin/SalesAgentsManagement';
import { SetupButton } from '../../../../components/admin/SetupButton';
import { createClient } from '../../../../lib/supabase/server';
import { isAdmin } from '../../../../lib/permissions';
import { logger } from '../../../../lib/logger';

export const metadata: Metadata = {
  title: 'Sales Agent Management - Admin Panel',
  description: 'Review and manage sales agent applications.',
  robots: 'noindex, nofollow',
};

export const dynamic = 'force-dynamic';

async function getApplications() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !await isAdmin(user)) {
    // This check is for server-side rendering.
    // The actual API has its own checks.
    return []; 
  }

  try {
    // First check if the sales_agents table exists by checking settings
    const { data: settingsCheck } = await supabase
      .from('settings')
      .select('key')
      .eq('key', 'sales_agent_commission')
      .maybeSingle();

    if (!settingsCheck) {
      // Migration hasn't been run yet
      logger.info('sales_agents_admin.migration_missing');
      return [];
    }

    // Now try to fetch sales agents data - simply return empty for now
    // The actual data will be fetched client-side via the API
    return [];
  } catch (error) {
    logger.error('sales_agents_admin.get_applications_failed', { error });
    return [];
  }
}

export default async function SalesAgentsAdminPage() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      redirect('/auth/login?message=Authentication required');
    }

    const hasAdminAccess = await isAdmin(user);
    if (!hasAdminAccess) {
      redirect('/auth/login?message=Admin access required');
    }

    // Check if migration has been run by looking for the sales_agents table
    const { error: tableError } = await supabase
      .from('sales_agents')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (tableError && (tableError.code === 'PGRST301' || tableError.message.includes('does not exist'))) {
      // Migration not run yet - show setup instructions
      return (
        <div className="container mx-auto py-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h1 className="text-2xl font-bold text-yellow-800 mb-4">Sales Agent Feature Setup Required</h1>
              <p className="text-yellow-700 mb-4">
                The Sales Agent feature needs to be set up. Click the button below to automatically set up the feature.
              </p>
              <SetupButton />
              <div className="mt-4 p-4 bg-white border rounded">
                <h3 className="font-semibold mb-2">What this will create:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Sales agent applications table</li>
                  <li>Commission tracking system</li>
                  <li>Point redemption system</li>
                  <li>Security policies and permissions</li>
                  <li>Required database functions</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      );
    }

    const applications = await getApplications();
    return <SalesAgentsManagement initialApplications={applications} />;
  } catch (error) {
    logger.error('sales_agents_admin.page_error', { error });
    redirect('/auth/login?message=Access denied');
  }
}