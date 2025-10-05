'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import NextDynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';

import { Mail, Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';

import { createClient } from '../../../lib/supabase/client';

// Force dynamic rendering for auth page
export const dynamic = 'force-dynamic';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';

import { useToast } from '../../../hooks/use-toast';
import { TwoFactorVerification } from '../../../components/auth/TwoFactorVerification';

function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [twoFactorUser, setTwoFactorUser] = useState<any>(null);

  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const Turnstile = useMemo(
    () => NextDynamic(() => import('react-turnstile').then(m => m.default), { ssr: false }) as unknown as React.ComponentType<any>,
    []
  );

  const searchParams = useSearchParams();
  const { toast } = useToast();
  const supabase = createClient();

  const verified = searchParams.get('verified');
  const emailParam = searchParams.get('email');

  // Check if account is locked out
  const isLockedOut = useMemo(() => {
    if (!lockoutUntil) return false;
    return Date.now() < lockoutUntil;
  }, [lockoutUntil]);

  // Calculate remaining lockout time
  const lockoutTimeRemaining = useMemo(() => {
    if (!isLockedOut || !lockoutUntil) return 0;
    return Math.ceil((lockoutUntil - Date.now()) / 1000);
  }, [isLockedOut, lockoutUntil]);

  useEffect(() => {
    if (verified === 'true') {
      toast({
        title: 'Email verified successfully!',
        description: 'Your account has been created. You can now sign in.',
      });
      if (emailParam) {
        setEmail(decodeURIComponent(emailParam));
      }
    }
  }, [verified, emailParam, toast]);

  const handleTwoFactorVerify = async (code: string) => {
    if (!twoFactorUser) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Invalid 2FA code');
        return;
      }

      toast({
        title: 'Welcome back!',
        description: 'You have been signed in successfully.',
      });

      // Fetch user profile to determine role-based redirect
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', twoFactorUser.id)
        .single();

      // Redirect based on user role
      const userRole = profile?.role || 'customer';
      let redirectUrl: string;

      switch (userRole) {
        case 'admin':
          redirectUrl = '/management/admin';
          break;
        case 'sales':
        case 'manager':
          redirectUrl = '/management/sales';
          break;
        case 'accounts':
          redirectUrl = '/management/accounts';
          break;
        case 'customer':
        default:
          redirectUrl = '/';
          break;
      }

      window.location.href = redirectUrl;
    } catch (err) {
      console.error('2FA verification error:', err);
      setError('An unexpected error occurred during 2FA verification.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTwoFactorCancel = () => {
    setShowTwoFactor(false);
    setTwoFactorUser(null);
    setError('');
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLockedOut) {
      setError(`Account temporarily locked. Please wait ${lockoutTimeRemaining} seconds before trying again.`);
      return;
    }

    if (turnstileSiteKey && !captchaToken) {
      setError('Please complete the security check.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        const newFailedAttempts = failedAttempts + 1;
        setFailedAttempts(newFailedAttempts);

        if (newFailedAttempts >= 5) {
          const lockoutDuration = Math.min(300000, 60000 * Math.pow(2, newFailedAttempts - 5));
          setLockoutUntil(Date.now() + lockoutDuration);
          setError(`Too many failed attempts. Account locked for ${Math.ceil(lockoutDuration / 1000)} seconds.`);
          return;
        }

        if (signInError.message.includes('Invalid login credentials')) {
          setError(`Invalid email or password. ${5 - newFailedAttempts} attempts remaining.`);
        } else if (signInError.message.includes('Email not confirmed')) {
          setError('Please verify your email address before signing in.');
        } else {
          setError(signInError.message);
        }
        return;
      }

      if (data.user) {
        setFailedAttempts(0);
        setLockoutUntil(null);
        setCaptchaToken(null);

        // Check if 2FA is enabled for this user
        try {
          const response = await fetch('/api/auth/2fa/status');
          const twoFactorStatus = await response.json();

          if (response.ok && twoFactorStatus.enabled) {
            setTwoFactorUser(data.user);
            setShowTwoFactor(true);
            setIsLoading(false);
            return;
          }
        } catch (error) {
          console.error('Error checking 2FA status:', error);
        }

        toast({
          title: 'Welcome back!',
          description: 'You have been signed in successfully.',
        });

        // Fetch user profile to determine role-based redirect
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        const userRole = profile?.role || 'customer';
        let redirectUrl: string;

        switch (userRole) {
          case 'admin':
            redirectUrl = '/management/admin';
            break;
          case 'sales':
        case 'manager':
          redirectUrl = '/management/sales';
          break;
        case 'accounts':
          redirectUrl = '/management/accounts';
          break;
        case 'customer':
        default:
          redirectUrl = '/';
          break;
      }

      window.location.href = redirectUrl;
      }
    } catch (err) {
      console.error('Sign in error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Sign In
          </CardTitle>
          <CardDescription className="text-gray-600">
            Welcome back! Enter your credentials to access your account.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!showTwoFactor ? (
            <>
              {verified === 'true' && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div className="text-sm text-green-700">
                    <strong>Account created successfully!</strong>
                    <br />
                    Your email has been verified. You can now sign in.
                  </div>
                </div>
              )}

              <form onSubmit={handleSignIn} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm text-red-700">{error}</span>
                  </div>
                )}

                {turnstileSiteKey && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Security Check</Label>
                    <Turnstile
                      sitekey={turnstileSiteKey}
                      onVerify={(token: string) => setCaptchaToken(token)}
                      onExpire={() => setCaptchaToken(null)}
                      onError={() => setCaptchaToken(null)}
                      options={{ 
                        action: 'signin',
                        theme: 'light',
                        size: 'normal'
                      }}
                    />
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || !email || !password || isLockedOut}
                >
                  {isLoading ? 'Signing in...' : isLockedOut ? `Locked (${lockoutTimeRemaining}s)` : 'Sign In'}
                </Button>
              </form>

              {failedAttempts > 0 && failedAttempts < 5 && (
                <div className="mt-4 text-center text-sm text-orange-600">
                  {5 - failedAttempts} attempts remaining before account lockout
                </div>
              )}

              <div className="mt-6 text-center space-y-3">
                {/* Force full reload on forgot password */}
                <a
                  href="/auth/forgot-password"
                  onClick={(e) => { e.preventDefault(); window.location.href = '/auth/forgot-password'; }}
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  Forgot your password?
                </a>

                <div className="text-sm text-gray-600">
                  Don't have an account?{' '}
                  <button
                    onClick={() => window.location.href = '/'}
                    className="text-blue-600 hover:text-blue-500 font-medium underline"
                  >
                    Sign up
                  </button>
                </div>
              </div>
            </>
          ) : (
            <TwoFactorVerification
              email={twoFactorUser?.email || ''}
              onVerify={handleTwoFactorVerify}
              onCancel={handleTwoFactorCancel}
              isLoading={isLoading}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <SignInForm />
    </Suspense>
  );
}