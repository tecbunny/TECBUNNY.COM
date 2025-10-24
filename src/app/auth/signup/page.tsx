'use client';

import { useState, useMemo } from 'react';
import NextDynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

// Force dynamic rendering for auth page
export const dynamic = 'force-dynamic';
import { Mail, Lock, User, Phone, Eye, EyeOff, CheckCircle, AlertCircle, MessageCircle } from 'lucide-react';

import Link from 'next/link';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';

import { useToast } from '../../../hooks/use-toast';
import { logger } from '../../../lib/logger';

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: ''
  });
  type PreferredChannel = 'email' | 'whatsapp';
  const [preferredChannel, setPreferredChannel] = useState<PreferredChannel>('email');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [dispatchedChannel, setDispatchedChannel] = useState<'email' | 'sms' | 'whatsapp' | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const captchaDisabled = process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DISABLE_CAPTCHA === 'true';
  // Allow quick runtime bypass via URL param ?disable_captcha=1 when not in production
  const runtimeBypass = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('disable_captcha') === '1';
  const captchaBypassed = captchaDisabled || (process.env.NODE_ENV !== 'production' && runtimeBypass);
  const Turnstile = useMemo(
    () => NextDynamic(() => import('react-turnstile').then(m => m.default), { ssr: false }) as unknown as React.ComponentType<any>,
    []
  );
  const getVerificationPrompt = (channel?: string) => {
    switch (channel) {
      case 'sms':
        return 'Answer the automated call to hear your verification code.';
      case 'whatsapp':
        return 'Please check your WhatsApp messages for the verification code.';
      default:
        return 'Please check your email inbox for verification instructions.';
    }
  };
  const getChannelLabel = (channel?: string) => {
    switch (channel) {
      case 'sms':
        return 'OTP on Call';
      case 'whatsapp':
        return 'WhatsApp';
      default:
        return 'email';
    }
  };
  
  const router = useRouter();
  const { toast } = useToast();

  if (captchaDisabled) {
    logger.debug('Captcha disabled in client (NEXT_PUBLIC_DISABLE_CAPTCHA=true and NODE_ENV!=production)');
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');

    if (name === 'mobile') {
      const digitsOnly = value.replace(/\D/g, '');
      if (digitsOnly.length < 10) {
        setPreferredChannel('email');
      }
    }
  };

  const handleChannelChange = (channel: PreferredChannel) => {
    setPreferredChannel(channel);
    setError('');
  };

  const normalizedMobile = formData.mobile.replace(/\D/g, '');
  const mobileSupportsMessaging = normalizedMobile.length >= 10;

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Name is required');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!formData.password) {
      setError('Password is required');
      return false;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }
    // Enhanced password validation
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      setError('Password must contain at least one uppercase letter, one lowercase letter, and one number');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
  if (!captchaBypassed && turnstileSiteKey && !captchaToken) {
      setError('Please complete the captcha.');
      return;
    }
    
    setIsLoading(true);
    setError('');

  try {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (captchaBypassed) headers['x-bypass-captcha'] = '1';
  const response = await fetch('/api/auth/signup', {
        method: 'POST',
    headers,
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          mobile: formData.mobile,
          password: formData.password,
      channel: preferredChannel,
      captchaToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 429 && data.waitTime) {
          setError(`${data.error} Please wait ${Math.ceil(data.waitTime / 60)} minutes before trying again.`);
        } else {
          setError(data.error || 'Signup failed');
        }
        return;
      }

      if (!data?.otpId || typeof data.otpId !== 'string') {
        logger.error('Signup response missing otpId', { data });
        setError('Could not start verification. Please try again.');
        toast({
          variant: 'destructive',
          title: 'Verification unavailable',
          description: 'We could not create a verification reference. Please try signing up again.'
        });
        return;
      }

      // Handle successful signup with potential email issues
      if (data.emailError) {
        // Account created but email failed
        setSuccess(true);
        toast({
          title: 'Account created!',
          description: data.message,
          variant: 'default'
        });
        
        // Show additional info for email issues
        setTimeout(() => {
          toast({
            title: 'Email Issue',
            description: 'You can request a new verification email from the sign-in page.',
            variant: 'default'
          });
        }, 3000);
      } else {
        // Normal successful signup
        setSuccess(true);
        toast({
          title: 'Account created successfully!',
          description: getVerificationPrompt(data.channel),
        });
      }

      const resolvedChannel = (['sms', 'email', 'whatsapp'].includes(data?.channel)
        ? data.channel
        : preferredChannel) as 'email' | 'sms' | 'whatsapp';
      setDispatchedChannel(resolvedChannel);

      // Persist signup session (email, name, mobile, password) for OTP verification and account creation
      try {
        const signupData = {
          email: formData.email,
          name: formData.name,
          mobile: formData.mobile,
          password: formData.password,
          otpId: data.otpId,
          channel: resolvedChannel,
          fallbackAvailable: data.fallbackAvailable ?? false,
          timestamp: Date.now(),
        };
        localStorage.setItem('signup_session', JSON.stringify(signupData));
        logger.debug('Signup session persisted', signupData);
      } catch (storageError) {
        logger.warn('Error storing signup session', {
          error: storageError instanceof Error ? storageError.message : String(storageError)
        });
      }

      // Redirect to verification page after 2 seconds
      setTimeout(() => {
        // Redirect to OTP verification page for signup
        const query = new URLSearchParams({
          email: formData.email,
          otpId: data.otpId,
          channel: resolvedChannel,
        });
        if (formData.mobile) {
          query.set('mobile', formData.mobile);
        }
        router.push(`/auth/verify-otp?${query.toString()}`);
      }, 2000);

    } catch (err) {
      logger.error('Signup error', {
        error: err instanceof Error ? err.message : String(err)
      });
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Account Created!
            </CardTitle>
            <CardDescription>
              {dispatchedChannel
                ? `Verification code sent via ${getChannelLabel(dispatchedChannel)}.`
                : "We're preparing your verification details."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 text-center">
              {`${getVerificationPrompt(dispatchedChannel ?? undefined)} Redirecting to verification page...`}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      {captchaDisabled && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-2 rounded-md z-50">
          Captcha is disabled in this development environment
        </div>
      )}
      <Card className="w-full max-w-4xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Create Account
          </CardTitle>
          <CardDescription>
            Join TecBunny Store and start shopping today
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  className="pl-10"
                  required
                />
              </div>
            </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile Number (Optional)</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="mobile"
                    name="mobile"
                    type="tel"
                    value={formData.mobile}
                    onChange={handleInputChange}
                    placeholder="Enter your mobile number"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Verification Method</Label>
                <div className="grid gap-3">
                <label className={`flex items-center justify-between rounded-lg border p-3 text-sm ${preferredChannel === 'email' ? 'border-blue-500 ring-1 ring-blue-200' : 'border-gray-200'}`}>
                  <span className="flex items-center gap-3">
                    <Mail className="h-4 w-4" />
                    <span className="flex flex-col">
                      <span className="font-medium">Email</span>
                      <span className="text-xs text-gray-500">Send code to your email address</span>
                    </span>
                  </span>
                  <input
                    type="radio"
                    name="verification-channel"
                    value="email"
                    checked={preferredChannel === 'email'}
                    onChange={() => handleChannelChange('email')}
                    className="h-4 w-4"
                  />
                </label>

                <label className={`flex items-center justify-between rounded-lg border p-3 text-sm ${preferredChannel === 'whatsapp' ? 'border-blue-500 ring-1 ring-blue-200' : 'border-gray-200'} ${!mobileSupportsMessaging ? 'opacity-60' : ''}`}>
                  <span className="flex items-center gap-3">
                    <MessageCircle className="h-4 w-4" />
                    <span className="flex flex-col">
                      <span className="font-medium">WhatsApp</span>
                      <span className="text-xs text-gray-500">Send code via WhatsApp</span>
                    </span>
                  </span>
                  <input
                    type="radio"
                    name="verification-channel"
                    value="whatsapp"
                    checked={preferredChannel === 'whatsapp'}
                    onChange={() => handleChannelChange('whatsapp')}
                    className="h-4 w-4"
                    disabled={!mobileSupportsMessaging}
                  />
                </label>
              </div>
              {!mobileSupportsMessaging && (
                <p className="text-xs text-gray-500">Add a valid mobile number to enable WhatsApp verification.</p>
              )}
            </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Create a password"
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Confirm your password"
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="md:col-span-2 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-700">{error}</span>
                </div>
              )}

              {turnstileSiteKey && !captchaDisabled && (
                <div className="space-y-2 md:col-span-2">
                  <Label>Security Check</Label>
                  <div className="mt-1">
                    <Turnstile
                      sitekey={turnstileSiteKey}
                      onVerify={(token: string) => setCaptchaToken(token)}
                      onExpire={() => setCaptchaToken(null)}
                      onError={() => setCaptchaToken(null)}
                      options={{ 
                        action: 'signup',
                        theme: 'light',
                        size: 'normal'
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="md:col-span-2 flex flex-col gap-4">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Button>

                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Already have an account?{' '}
                    <Link href="/auth/signin" className="font-medium text-blue-600 hover:text-blue-500">
                      Sign in
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}