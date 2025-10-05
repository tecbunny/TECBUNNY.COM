'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { toast } from 'react-hot-toast';

import { logger } from '../../../lib/logger';

export function OTPVerificationContent() {
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [resendCount, setResendCount] = useState(0);
  const [lastResendTime, setLastResendTime] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verified, setVerified] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Get email from URL parameters or localStorage
    const urlEmail = searchParams.get('email');
    
    if (urlEmail) {
      setEmail(urlEmail);
    } else {
      // Fallback to localStorage
      const storedData = localStorage.getItem('signup_session');
      if (storedData) {
        try {
          const { email: storedEmail } = JSON.parse(storedData);
          if (storedEmail) {
            setEmail(storedEmail);
          }
        } catch (error) {
          logger.error('Error parsing stored signup data:', { error });
        }
      } else {
        logger.error('No signup session found');
        toast.error('No signup session found. Please start signup process again.');
        router.push('/');
      }
    }

    // Update cooldown timer
    const updateCooldown = () => {
      if (lastResendTime > 0) {
        const elapsed = Date.now() - lastResendTime;
        const remaining = Math.max(0, 60000 - elapsed); // 60 second cooldown
        setResendCooldown(Math.ceil(remaining / 1000));
        
        if (remaining <= 0) {
          setLastResendTime(0);
        }
      }
    };

    updateCooldown();
    const interval = setInterval(updateCooldown, 1000);

    return () => clearInterval(interval);
  }, [searchParams, router, lastResendTime]);

  // Debug button state
  useEffect(() => {
    const buttonDisabled = isLoading || otp.length !== 4 || verified;
    logger.debug('Button state update:', {
      isLoading,
      otpLength: otp.length,
      verified,
      disabled: buttonDisabled,
      otp
    });
  }, [isLoading, otp, verified]);

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    logger.info('Form submitted - Verify OTP triggered!');
    logger.debug('Verify OTP submitted:', {
      otp,
      otpLength: otp.length,
      email,
      isLoading,
      verified
    });
    
    if (!otp || otp.length !== 4) {
      logger.warn('Invalid OTP length');
      toast.error('Please enter a valid 4-digit OTP');
      return;
    }

    if (!email) {
      logger.warn('No email found');
      toast.error('Email not found. Please start signup process again.');
      router.push('/');
      return;
    }

    logger.info('All validations passed, proceeding with OTP verification');
    setIsLoading(true);

    try {
      // Step 1: Verify OTP
    // include mobile from local signup session if available so SMS flows can be verified
    const stored = localStorage.getItem('signup_session');
    let storedMobile: string | undefined = undefined;
    if (stored) {
      try { storedMobile = JSON.parse(stored).mobile; } catch {}
    }

    const headers: any = { 'Content-Type': 'application/json' };
    // Always bypass CAPTCHA for OTP verification
    headers['x-bypass-captcha'] = '1';

    const requestBody = {
      email,
      mobile: storedMobile,
      otp,
      type: 'signup'
    };

    logger.debug('Sending OTP verification request:', {
      url: '/api/auth/verify-otp',
      headers,
      body: requestBody
    });

    const verifyResponse = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      const verifyResult = await verifyResponse.json();

      logger.debug('Raw API Response:', {
        status: verifyResponse.status,
        statusText: verifyResponse.statusText,
        headers: Object.fromEntries(verifyResponse.headers.entries()),
        result: verifyResult
      });

      if (!verifyResponse.ok) {
        logger.error('OTP verification failed:', {
          status: verifyResponse.status,
          statusText: verifyResponse.statusText,
          result: verifyResult
        });
        
        // Try to extract a meaningful error message
        let errorMessage = 'Verification failed';
        if (verifyResult) {
          if (typeof verifyResult === 'string') {
            errorMessage = verifyResult;
          } else if (verifyResult.error?.message) {
            // API error format: { error: { code, message } }
            errorMessage = verifyResult.error.message;
          } else if (verifyResult.error?.code) {
            errorMessage = `Error: ${verifyResult.error.code}`;
          } else if (verifyResult.error) {
            errorMessage = verifyResult.error;
          } else if (verifyResult.message) {
            errorMessage = verifyResult.message;
          } else if (verifyResult.details) {
            errorMessage = verifyResult.details;
          }
        }
        
        logger.error('Extracted error message:', { errorMessage });
        throw new Error(errorMessage);
      }

      // OTP verified successfully
      logger.info('OTP verified successfully', { verifyResult });

      // Show verified state in UI and feedback
      setVerified(true);
      toast.success(verifyResult.message || 'Verification successful');

      // For signup type, now create the user account
      if (verifyResult.type === 'signup' || verifyResult.requiresAccountCreation) {
        try {
          // Get stored signup data from localStorage
          const stored = localStorage.getItem('signup_session');
          if (!stored) {
            throw new Error('Signup data not found. Please restart the signup process.');
          }

          const signupData = JSON.parse(stored);
          logger.info('Creating account with stored data:', { email: signupData.email, name: signupData.name });

          // Call complete-signup endpoint to create the account
          const completeResponse = await fetch('/api/auth/complete-signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: signupData.email,
              password: signupData.password,
              name: signupData.name,
              mobile: signupData.mobile,
              otpVerified: true
            }),
          });

          const completeResult = await completeResponse.json();

          if (!completeResponse.ok) {
            throw new Error(completeResult.error || 'Failed to create account');
          }

          logger.info('Account created successfully', { completeResult });
          logger.debug('Complete result details:', {
            session: !!completeResult.session,
            requiresSignIn: completeResult.requiresSignIn,
            hasAccessToken: !!(completeResult.session?.access_token),
            hasRefreshToken: !!(completeResult.session?.refresh_token)
          });
          toast.success('Account created successfully!');

          // Clean up stored session data
          localStorage.removeItem('signup_session');
          setOtp('');

          // Check if we got a session for automatic signin
          if (completeResult.session && !completeResult.requiresSignIn) {
            logger.info('Account created and user signed in automatically');
            toast.success('Welcome! Redirecting to home page...');
            
            // Clean up stored data
            localStorage.removeItem('signup_session');
            
            // Force a full page refresh to ensure auth state is updated
            setTimeout(() => {
              logger.info('Redirecting to home page with page refresh');
              window.location.href = '/';
            }, 1500);
          } else {
            // Account created successfully - redirect to sign in
            logger.info('Account created, redirecting to sign-in page');
            toast.success('Account created! Please sign in to continue.');
            setTimeout(() => {
              router.push(`/auth/signin?email=${encodeURIComponent(email)}&verified=true&accountCreated=true`);
            }, 1500);
          }
        } catch (accountCreationError) {
          logger.error('Account creation error:', { accountCreationError });
          toast.error(accountCreationError instanceof Error ? accountCreationError.message : 'Failed to create account');
          // Clean up and let user retry
          setIsLoading(false);
          return;
        }
      } else {
        // For non-signup verifications, just redirect to success page
        setTimeout(() => {
          router.push(`/auth/verification-success?email=${encodeURIComponent(email)}`);
        }, 1200);
      }
      
    } catch (error) {
      logger.error('OTP verification error:', { error });
      if (error instanceof Error) {
        logger.error('Error message:', { message: error.message, stack: error.stack });
      } else {
        logger.error('Error details:', { error: JSON.stringify(error, null, 2) });
      }
      toast.error(error instanceof Error ? error.message : 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!email) {
      toast.error('Email not found. Please restart the signup process.');
      return;
    }

    // Check cooldown
    if (resendCooldown > 0) {
      toast.error(`Please wait ${resendCooldown} seconds before requesting another code.`);
      return;
    }

    // include mobile from local signup session when available (supports SMS flows)
    const stored = localStorage.getItem('signup_session');
    let storedMobile: string | undefined = undefined;
    if (stored) {
      try { storedMobile = JSON.parse(stored).mobile; } catch {}
    }

    setIsResending(true);

    try {
    const headers: any = { 'Content-Type': 'application/json' };
    headers['x-bypass-captcha'] = '1';

    const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email,
      mobile: storedMobile,
      type: 'signup',
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setResendCount(prev => prev + 1);
        setLastResendTime(Date.now());
        toast.success(result.message || 'New verification code sent!');
        setOtp(''); // Clear current OTP input
      } else {
        throw new Error(result.error || 'Failed to resend verification code');
      }
    } catch (error) {
      logger.error('Resend OTP error:', { error });
      toast.error(error instanceof Error ? error.message : 'Failed to resend verification code');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {verified && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md flex items-center space-x-3">
            <span className="text-2xl">✅</span>
            <div>
              <div className="font-medium">Verification complete</div>
              <div className="text-sm">Redirecting you to the next step...</div>
            </div>
          </div>
        )}
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Verify Your Email
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            We've sent a 4-digit code to
            <span className="font-medium text-gray-900 block">{email}</span>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleVerifyOTP}>
          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
              Verification Code
            </label>
            <input
              id="otp"
              name="otp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              required
              className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm text-center text-lg tracking-widest"
              placeholder="0000"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
              autoComplete="one-time-code"
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={isLoading || otp.length !== 4 || verified}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verifying...
                </>
              ) : (
                'Verify & Complete Signup'
              )}
            </button>
          </div>
          
          <div className="text-center">
            <button
              type="button"
              onClick={handleResendOTP}
              disabled={isResending || resendCooldown > 0 || verified}
              className={`text-sm transition-colors ${
                isResending || resendCooldown > 0
                  ? 'text-gray-400 cursor-not-allowed' 
                  : 'text-blue-600 hover:text-blue-500'
              }`}
            >
              {isResending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </>
              ) : resendCooldown > 0 ? (
                `Wait ${resendCooldown}s to resend`
              ) : (
                `Didn't receive the code? Resend (${resendCount}/5)`
              )}
            </button>
            {resendCount > 0 && resendCooldown === 0 && (
              <div className="text-xs text-gray-500 mt-1">
                {resendCount}/5 resend attempts used
              </div>
            )}
          </div>
          <div className="text-center">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="text-sm text-gray-600 hover:text-gray-500"
            >
              ← Back to Home
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
