'use client';

import { useEffect, useState, useMemo } from 'react';
import NextDynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

// Force dynamic rendering for auth page
export const dynamic = 'force-dynamic';
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';

import Link from 'next/link';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';

import { useToast } from '../../../hooks/use-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [error, setError] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  const captchaDisabled = process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DISABLE_CAPTCHA === 'true';
  
  const Turnstile = useMemo(
    () => NextDynamic(() => import('react-turnstile').then(m => m.default), { ssr: false }) as unknown as React.ComponentType<any>,
    []
  );
  
  // Robust redirect when reset completes
  useEffect(() => {
    if (!resetComplete) return;
    // Try client-side replace quickly
    const t1 = setTimeout(() => {
      try { router.replace('/auth/signin'); } catch {}
    }, 1200);
    // Hard fallback after a few seconds in case client navigation is blocked
    const t2 = setTimeout(() => {
      if (typeof window !== 'undefined') {
        try { window.location.assign('/auth/signin'); } catch {}
      }
    }, 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [resetComplete, router]);

  const handleSubmitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (!!turnstileSiteKey && !captchaDisabled && !captchaToken) {
        setError('Please complete the CAPTCHA to continue.');
        setIsLoading(false);
        return;
      }
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, captchaToken }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to send reset email');
        return;
      }

      setEmailSent(true);
      toast({
        title: 'OTP sent successfully!',
        description: 'Check your email for the 4-digit OTP code to reset your password.',
      });

    } catch (_err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!otp.trim()) {
      setError('Please enter the OTP code');
      return;
    }

    if (!newPassword.trim()) {
      setError('Please enter a new password');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: email.trim(),
          otp: otp.trim(),
          newPassword 
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reset password');
      }

      setResetComplete(true);
      toast({
        title: "Password Reset Successful!",
        description: "Your password has been reset. Redirecting to login...",
      });
      
      // Redirect to login page after 2 seconds
      setTimeout(() => {
        router.push('/auth/signin');
      }, 2000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reset password';
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (resetComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Password Reset Successful!
            </CardTitle>
            <CardDescription>
              Your password has been updated successfully. Redirecting to sign in...
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Link href="/auth/signin">
              <Button className="w-full" variant="default">Go to Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900">
              Enter OTP & Reset Password
            </CardTitle>
            <CardDescription>
              We've sent a 4-digit OTP code to {email}. Enter it below to reset your password.
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="otp">OTP Code</Label>
                <Input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="Enter 4-digit OTP"
                  maxLength={4}
                  className="text-center text-lg tracking-widest"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-700">{error}</span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                aria-disabled={isLoading}
              >
                {isLoading ? 'Resetting Password...' : 'Reset Password'}
              </Button>
            </form>

            <div className="mt-6 space-y-3">
              <Button
                onClick={() => {
                  setEmailSent(false);
                  setEmail('');
                  setOtp('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setError('');
                }}
                variant="outline"
                className="w-full"
              >
                Try Different Email
              </Button>

              <Link href="/auth/signin" className="block">
                <Button variant="ghost" className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Sign In
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Forgot Password?
          </CardTitle>
          <CardDescription>
            Enter your email address and we'll send you a 4-digit OTP code to reset your password.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmitEmail} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !email || (!!turnstileSiteKey && !captchaDisabled && !captchaToken)}
            >
              {isLoading ? 'Sending OTP...' : 'Send OTP Code'}
            </Button>

            {!!turnstileSiteKey && !captchaDisabled && (
              <div className="mt-3">
                <Label>Security Verification</Label>
                <Turnstile
                  sitekey={turnstileSiteKey}
                  onVerify={(token: string) => setCaptchaToken(token)}
                  onExpire={() => setCaptchaToken(null)}
                  onError={() => setCaptchaToken(null)}
                />
              </div>
            )}
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/auth/signin"
              className="text-sm text-blue-600 hover:text-blue-500 flex items-center justify-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
