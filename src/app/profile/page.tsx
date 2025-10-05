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
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  // Get sales agent application status if exists
  const { data: salesAgentData } = await supabase
    .from('sales_agents')
    .select('*')
    .eq('user_id', user.id)
    .single();

  return {
    user,
    profile,
    salesAgentData
  };
}

export default async function ProfilePage() {
  const { user, profile, salesAgentData } = await getUserData();
  
  return <UserProfile user={user} profile={profile} salesAgentData={salesAgentData} />;
}