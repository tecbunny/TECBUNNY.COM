'use client';

import React from 'react';

import { User, CheckCircle, XCircle, Clock, Users, Edit } from 'lucide-react';

import type { User as SupabaseUser } from '@supabase/supabase-js';

import { logger } from '../../lib/logger';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { useToast } from '../../hooks/use-toast';

import { EditProfileDialog } from '../../components/profile/EditProfileDialog';
import { TwoFactorSetup } from '../../components/auth/TwoFactorSetup';
import { useAuth } from '../../lib/hooks';

interface UserProfileProps {
  user: SupabaseUser;
  profile: any;
  salesAgentData: any;
}

export default function UserProfile({ user, profile, salesAgentData }: UserProfileProps) {
  const [isApplying, setIsApplying] = React.useState(false);
  const [agentStatus, setAgentStatus] = React.useState(salesAgentData);
  const [showTwoFactorSetup, setShowTwoFactorSetup] = React.useState(false);
  const [twoFactorStatus, setTwoFactorStatus] = React.useState<any>(null);
  const { toast } = useToast();
  const { updateUser } = useAuth();

  // Fetch 2FA status on component mount
  React.useEffect(() => {
    const fetchTwoFactorStatus = async () => {
      try {
        const response = await fetch('/api/auth/2fa/status');
        if (response.ok) {
          const status = await response.json();
          setTwoFactorStatus(status);
        }
      } catch (error) {
        logger.error('Failed to fetch 2FA status:', { error });
      }
    };

    fetchTwoFactorStatus();
  }, []);

  const handleApplyForAgent = async () => {
    setIsApplying(true);
    try {
      const response = await fetch('/api/sales-agents/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || 'Failed to submit application.');
      }

      // Update local state to show pending status
      setAgentStatus({ status: 'pending' });

      toast({
        title: 'Application Submitted',
        description: 'Your application has been submitted successfully. You will be notified once reviewed.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setIsApplying(false);
    }
  };

  const handleDisable2FA = async () => {
    const code = prompt('Enter your 2FA code to disable two-factor authentication:');
    if (!code) return;

    try {
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error);
      }

      // Refresh 2FA status
      const statusResponse = await fetch('/api/auth/2fa/status');
      if (statusResponse.ok) {
        const status = await statusResponse.json();
        setTwoFactorStatus(status);
      }

      toast({
        title: '2FA Disabled',
        description: 'Two-factor authentication has been disabled for your account.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Pending Review
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="default" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        {/* Profile Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Your Profile</CardTitle>
                <CardDescription>
                  Manage your account settings and preferences
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Name</label>
                <p className="text-lg">
                  {profile?.name && profile.name !== user.email 
                    ? profile.name 
                    : user.user_metadata?.name || user.email?.split('@')[0] || 'User'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="text-lg">{user.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Role</label>
                <p className="text-lg capitalize">
                  {profile?.role || user.app_metadata?.role || 'customer'}
                </p>
                {(profile?.role === 'admin' || profile?.role === 'superadmin' || 
                  user.app_metadata?.role === 'admin' || user.app_metadata?.role === 'superadmin') && (
                  <Badge variant="default" className="ml-2">Admin</Badge>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Mobile</label>
                <p className="text-lg">{profile?.mobile || 'Not provided'}</p>
              </div>
            </div>
            
            {/* Edit Profile Button */}
            <div className="mt-6 pt-6 border-t">
              <EditProfileDialog onProfileUpdate={updateUser}>
                <Button variant="outline" className="w-full sm:w-auto">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Profile
                </Button>
              </EditProfileDialog>
            </div>
          </CardContent>
        </Card>

        {/* Security Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Manage your account security and two-factor authentication
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-semibold">Two-Factor Authentication</h4>
                  <p className="text-sm text-muted-foreground">
                    {twoFactorStatus?.enabled
                      ? '2FA is enabled for your account'
                      : 'Add an extra layer of security to your account'
                    }
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {twoFactorStatus?.enabled ? (
                    <>
                      <Badge variant="default" className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Enabled
                      </Badge>
                      <Button
                        onClick={handleDisable2FA}
                        variant="outline"
                        size="sm"
                      >
                        Disable
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={() => setShowTwoFactorSetup(true)}
                      variant="outline"
                    >
                      Enable 2FA
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sales Agent Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <CardTitle>Sales Agent Program</CardTitle>
                <CardDescription>
                  Join our sales agent program to earn commissions on successful referrals
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!agentStatus ? (
              // Not applied yet
              <div className="space-y-4">
                <div className="p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-semibold mb-2">Benefits of becoming a Sales Agent:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Earn points for every successful referral</li>
                    <li>• Convert points to real money (1 point = ₹1)</li>
                    <li>• Access to exclusive promotional materials</li>
                    <li>• Track your earnings and performance</li>
                  </ul>
                </div>
                <Button onClick={handleApplyForAgent} disabled={isApplying}>
                  {isApplying ? 'Submitting Application...' : 'Apply to Become a Sales Agent'}
                </Button>
              </div>
            ) : (
              // Already applied
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Application Status</h4>
                    <p className="text-sm text-muted-foreground">
                      Your sales agent application is currently under review
                    </p>
                  </div>
                  {getStatusBadge(agentStatus.status)}
                </div>

                {agentStatus.status === 'approved' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-green-50">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Your Referral Code</label>
                      <p className="text-lg font-mono">{agentStatus.referral_code}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Points Balance</label>
                      <p className="text-lg">₹{agentStatus.points_balance || 0}</p>
                    </div>
                  </div>
                )}

                {agentStatus.status === 'rejected' && (
                  <div className="p-4 border rounded-lg bg-red-50">
                    <p className="text-sm text-red-700">
                      Your application was not approved. You may contact support for more information.
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 2FA Setup Dialog */}
      {showTwoFactorSetup && (
        <TwoFactorSetup
          onComplete={() => {
            setShowTwoFactorSetup(false);
            // Refresh 2FA status
            const fetchStatus = async () => {
              try {
                const response = await fetch('/api/auth/2fa/status');
                if (response.ok) {
                  const status = await response.json();
                  setTwoFactorStatus(status);
                }
              } catch (error) {
                logger.error('Failed to refresh 2FA status:', { error });
              }
            };
            fetchStatus();
            toast({
              title: '2FA Enabled',
              description: 'Two-factor authentication has been successfully enabled for your account.',
            });
          }}
          onCancel={() => setShowTwoFactorSetup(false)}
        />
      )}
    </div>
  );
}