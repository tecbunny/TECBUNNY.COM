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
    salesAgentData
  };
}

export default async function ProfilePage() {
  const { user, profile, salesAgentData } = await getUserData();
  
  return <UserProfile user={user} profile={profile} salesAgentData={salesAgentData} />;
}