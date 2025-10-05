'use client';

import { useState, useMemo } from 'react';
import NextDynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

// Force dynamic rendering for auth page
export const dynamic = 'force-dynamic';
import { Mail, Lock, User, Phone, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
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
  
  const router = useRouter();
  const { toast } = useToast();

  if (captchaDisabled) {
    logger.debug('Captcha disabled in client (NEXT_PUBLIC_DISABLE_CAPTCHA=true and NODE_ENV!=production)');
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setError('');
  };

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
  const headers: any = { 'Content-Type': 'application/json' };
  if (captchaBypassed) headers['x-bypass-captcha'] = '1';
  const response = await fetch('/api/auth/signup', {
        method: 'POST',
    headers,
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          mobile: formData.mobile,
          password: formData.password,
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
          description: 'Please check your email for verification instructions.',
        });
      }

      // Persist signup session (email, name, mobile) so the verify page and resend flows
      // can include the mobile identifier when needed (supports SMS OTP flows).
      try {
        const signupData = {
          email: formData.email,
          name: formData.name,
          mobile: formData.mobile,
          timestamp: Date.now(),
        };
        localStorage.setItem('signup_session', JSON.stringify(signupData));
      } catch (storageError) {
        logger.warn('Error storing signup session', {
          error: storageError instanceof Error ? storageError.message : String(storageError)
        });
      }

      // Redirect to verification page after 2 seconds
      setTimeout(() => {
        router.push(`/auth/verify-email?email=${encodeURIComponent(formData.email)}`);
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
              We've sent a verification code to your email address.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 text-center">
              Check your email and follow the instructions to verify your account.
              Redirecting to verification page...
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
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Create Account
          </CardTitle>
          <CardDescription>
            Join TecBunny Store and start shopping today
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
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
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            {turnstileSiteKey && !captchaDisabled && (
              <div className="space-y-2">
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

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/auth/signin" className="font-medium text-blue-600 hover:text-blue-500">
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}