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
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [error, setError] = useState('');
  const [preferredChannel, setPreferredChannel] = useState<'email' | 'sms' | 'whatsapp'>('email');
  const [activeChannel, setActiveChannel] = useState<'email' | 'sms' | 'whatsapp'>('email');
  const [otpId, setOtpId] = useState<string | null>(null);
  const [fallbackAvailable, setFallbackAvailable] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [lastResendTime, setLastResendTime] = useState(0);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  const captchaDisabled = process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DISABLE_CAPTCHA === 'true';
  const sanitizedMobile = useMemo(() => mobile.replace(/\D/g, ''), [mobile]);
  const phoneEnabled = sanitizedMobile.length >= 10;
  const emailAvailable = useMemo(() => Boolean(email.trim()), [email]);

  useEffect(() => {
    if (!phoneEnabled && (preferredChannel === 'sms' || preferredChannel === 'whatsapp')) {
      setPreferredChannel('email');
    }
    if (!phoneEnabled && (activeChannel === 'sms' || activeChannel === 'whatsapp')) {
      setActiveChannel('email');
    }
  }, [phoneEnabled, preferredChannel, activeChannel]);
  
  const Turnstile = useMemo(
    () => NextDynamic(() => import('react-turnstile').then(m => m.default), { ssr: false }) as unknown as React.ComponentType<any>,
    []
  );

  const channelDisplayName: Record<'email' | 'sms' | 'whatsapp', string> = useMemo(() => ({
    email: 'Email',
    sms: 'OTP on Call',
    whatsapp: 'WhatsApp'
  }), []);

  const channelInstruction = (channel: 'email' | 'sms' | 'whatsapp') => {
    switch (channel) {
      case 'sms':
        return 'Answer the automated call on the registered mobile number.';
      case 'whatsapp':
        return 'Check WhatsApp on the registered mobile number.';
      default:
        return 'Check the inbox of your email address for the 4-digit code.';
    }
  };

  const resolveChannel = (
    value: unknown,
    fallback: 'email' | 'sms' | 'whatsapp' = 'email'
  ): 'email' | 'sms' | 'whatsapp' => {
    return value === 'sms' || value === 'whatsapp' || value === 'email'
      ? value
      : fallback;
  };

  const handlePreferredChannelChange = (channel: 'email' | 'sms' | 'whatsapp') => {
    if (channel === preferredChannel) return;
    if ((channel === 'sms' || channel === 'whatsapp') && !phoneEnabled) {
      setError('Add a valid mobile number to use OTP on Call or WhatsApp.');
      return;
    }
    setPreferredChannel(channel);
    setError('');
  };

  const handleActiveChannelChange = (channel: 'email' | 'sms' | 'whatsapp') => {
    if (resetComplete || isResending) return;
    if (channel === activeChannel) return;
    if ((channel === 'sms' || channel === 'whatsapp') && !phoneEnabled) {
      toast({
        variant: 'destructive',
        title: 'Mobile number required',
        description: 'Add a valid mobile number to receive codes via OTP on Call or WhatsApp.'
      });
      return;
    }
    setActiveChannel(channel);
    setOtp('');
    toast({
      title: `${channelDisplayName[channel]} selected`,
      description: 'Use Resend to receive a new code on this channel.'
    });
  };
  
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

  useEffect(() => {
    if (!lastResendTime) {
      setResendCooldown(0);
      return;
    }
    const updateCooldown = () => {
      const elapsed = Date.now() - lastResendTime;
      const remaining = Math.max(0, 60000 - elapsed);
      setResendCooldown(Math.ceil(remaining / 1000));
      if (remaining <= 0) {
        setLastResendTime(0);
      }
    };

    updateCooldown();
    const interval = window.setInterval(updateCooldown, 1000);
    return () => window.clearInterval(interval);
  }, [lastResendTime]);

  const handleSubmitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (!email.trim() && !phoneEnabled) {
        setError('Enter your email address or add a valid mobile number.');
        setIsLoading(false);
        return;
      }

      if ((preferredChannel === 'sms' || preferredChannel === 'whatsapp') && !phoneEnabled) {
        setError('Add a valid mobile number (10+ digits) for OTP on Call or WhatsApp verification.');
        setIsLoading(false);
        return;
      }

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
        body: JSON.stringify({
          email: email.trim() || undefined,
          mobile: phoneEnabled ? sanitizedMobile : undefined,
          captchaToken,
          channel: preferredChannel,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to send reset email');
        return;
      }

      setOtpId(result.otpId || null);
      const resolvedChannel = resolveChannel(result.channel, preferredChannel);
      setActiveChannel(resolvedChannel);
      setFallbackAvailable(Boolean(result.fallbackAvailable));
      setLastResendTime(Date.now());
      setEmailSent(true);
      toast({
        title: 'OTP sent successfully!',
        description: resolvedChannel === 'sms'
          ? 'Answer the automated call to hear your 4-digit code.'
          : `Check your ${channelDisplayName[resolvedChannel]} messages for the 4-digit code.`,
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

    if (!otpId) {
      setError('Verification reference missing or expired. Please request a new code.');
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
          mobile: phoneEnabled ? sanitizedMobile : undefined,
          otp: otp.trim(),
          otpId,
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

  const handleResendCode = async () => {
    if (!otpId) {
      setError('Verification reference missing. Start the reset process again.');
      return;
    }

    if (resendCooldown > 0) {
      toast({
        variant: 'destructive',
        title: 'Slow down',
        description: `Please wait ${resendCooldown} seconds before requesting another code.`
      });
      return;
    }

    if ((activeChannel === 'sms' || activeChannel === 'whatsapp') && !phoneEnabled) {
      toast({
        variant: 'destructive',
        title: 'Mobile number required',
        description: 'Add a valid mobile number to receive codes via OTP on Call or WhatsApp.'
      });
      return;
    }

    setIsResending(true);
    setError('');

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          otpId,
          channel: activeChannel,
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend verification code');
      }

      setLastResendTime(Date.now());
      setOtp('');
      const nextChannel = resolveChannel(data.channel, activeChannel);
      setActiveChannel(nextChannel);
      if (Array.isArray(data.availableFallbacks)) {
        setFallbackAvailable(data.availableFallbacks.length > 0);
      }
      if (data.otpId) {
        setOtpId(data.otpId);
      }
      toast({
        title: 'Code resent',
        description: `We sent a new code via ${channelDisplayName[nextChannel]}.`
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to resend verification code';
      setError(message);
      toast({
        variant: 'destructive',
        title: 'Resend failed',
        description: message,
      });
    } finally {
      setIsResending(false);
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
              We sent a 4-digit code via {channelDisplayName[activeChannel]}.
              {activeChannel === 'email' && emailAvailable && (
                <span className="block font-medium text-gray-900">{email}</span>
              )}
              {activeChannel !== 'email' && phoneEnabled && (
                <span className="block font-medium text-gray-900">+{sanitizedMobile}</span>
              )}
              <span className="block text-xs text-gray-500 mt-1">{channelInstruction(activeChannel)}</span>
              {fallbackAvailable && (
                <span className="block text-xs text-gray-500 mt-1">Need a different channel? Pick another option below and resend.</span>
              )}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="space-y-2">
                <Label>Verification method</Label>
                <div className="grid gap-2">
                  {(['email', 'sms', 'whatsapp'] as const).map(option => {
                    const enabled = option === 'email' ? emailAvailable : phoneEnabled;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleActiveChannelChange(option)}
                        disabled={!enabled}
                        className={`flex w-full flex-col rounded-lg border p-3 text-left transition ${
                          activeChannel === option ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white'
                        } ${!enabled ? 'opacity-60 cursor-not-allowed' : 'hover:border-blue-300 hover:bg-blue-50'}`}
                      >
                        <span className="text-sm font-medium">{channelDisplayName[option]}</span>
                        <span className="text-xs text-gray-500">{channelInstruction(option)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

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

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                aria-disabled={isLoading}
              >
                {isLoading ? 'Resetting Password...' : 'Reset Password'}
              </Button>
            </form>

            <div className="mt-4 flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={handleResendCode}
                disabled={isResending || resendCooldown > 0}
              >
                {isResending
                  ? 'Sending...'
                  : resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : `Resend via ${channelDisplayName[activeChannel]}`}
              </Button>
              <span className="text-xs text-gray-500">OTP reference: {otpId?.slice(0, 8) ?? 'pending'}</span>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            <div className="mt-6 space-y-3">
              <Button
                onClick={() => {
                  setEmailSent(false);
                  setEmail('');
                  setMobile('');
                  setOtp('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setOtpId(null);
                  setPreferredChannel('email');
                  setActiveChannel('email');
                  setFallbackAvailable(false);
                  setLastResendTime(0);
                  setResendCooldown(0);
                  setCaptchaToken(null);
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
            Share your email or mobile number and choose how you'd like to receive the 4-digit reset code.
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
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile number (optional)</Label>
              <Input
                id="mobile"
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="Include country code, e.g. 91XXXXXXXXXX"
              />
              {!phoneEnabled && mobile && (
                <p className="text-xs text-gray-500">Enter at least 10 digits to enable OTP on Call or WhatsApp.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Verification method</Label>
              <div className="grid gap-2">
                {(['email', 'sms', 'whatsapp'] as const).map(option => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handlePreferredChannelChange(option)}
                    disabled={(option === 'sms' || option === 'whatsapp') && !phoneEnabled}
                    className={`flex w-full flex-col rounded-lg border p-3 text-left transition ${
                      preferredChannel === option ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white'
                    } ${(option === 'sms' || option === 'whatsapp') && !phoneEnabled ? 'opacity-60 cursor-not-allowed' : 'hover:border-blue-300 hover:bg-blue-50'}`}
                  >
                    <span className="text-sm font-medium">{channelDisplayName[option]}</span>
                    <span className="text-xs text-gray-500">
                      {option === 'email' && 'Use your account email address'}
                      {option === 'sms' && 'Receive an automated call with the code'}
                      {option === 'whatsapp' && 'Send code via WhatsApp'}
                    </span>
                  </button>
                ))}
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
              disabled={
                isLoading ||
                (!email.trim() && !phoneEnabled) ||
                (!!turnstileSiteKey && !captchaDisabled && !captchaToken)
              }
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
