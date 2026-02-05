import { Metadata } from 'next';

import { redirect } from 'next/navigation';

import UserProfile from '../../components/profile/UserProfile';
import { createClient } from '../../lib/supabase/server';

export const metadata: Metadata = {
  title: 'Profile - TecBunny Store',
  description: 'Manage your account and preferences.',
};

export const dynamic = 'force-dynamic';

async function getUserData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/signin');
  }

  // Get user profile data
  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  // Get sales agent application status if exists
  const { data: salesAgentData } = await supabase
    .from('sales_agents')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  let recentOrders: any[] = [];
  let recentTickets: any[] = [];

  try {
    const { data } = await supabase
      .from('orders')
      .select('id, status, total, total_amount, created_at, type')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(3);
    recentOrders = data ?? [];
  } catch (error) {
    // Swallow errors to avoid breaking profile page if table missing
  }

  try {
    const { data } = await supabase
      .from('service_tickets')
      .select('id, issue_description, status, priority, created_at')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);
    recentTickets = data ?? [];
  } catch (error) {
    // Swallow errors to avoid breaking profile page if table missing
  }

  let quotes: any[] = [];
  try {
    const { data } = await supabase
      .from('quotes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    quotes = data ?? [];
  } catch (error) {
    // Ignore error
  }

  const fallbackProfile = profileData ?? {
    id: user.id,
    name: user.user_metadata?.name ?? user.email?.split('@')[0] ?? 'User',
    email: user.email,
    mobile: user.user_metadata?.mobile ?? '',
    role: (user.app_metadata?.role as string) ?? 'customer'
  };

  return {
    user,
    profile: fallbackProfile,
    salesAgentData,
    recentOrders: recentOrders ?? [],
    recentTickets: recentTickets ?? [],
    quotes
  };
}

export default async function ProfilePage() {
  const { user, profile, salesAgentData, recentOrders, recentTickets, quotes } = await getUserData();
  
  return (
    <UserProfile
      user={user}
      profile={profile}
      salesAgentData={salesAgentData}
      orders={recentOrders}
      serviceTickets={recentTickets}
      quotes={quotes}
    />
  );
}