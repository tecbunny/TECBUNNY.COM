import { useState, useCallback, useEffect } from 'react';

export type OTPChannel = 'sms' | 'email' | 'whatsapp';
export type OTPPurpose = 'login' | 'registration' | 'password_reset' | 'transaction' | 'agent_order';

interface UseOTPOptions {
  phone?: string;
  email?: string;
  purpose: OTPPurpose;
  preferredChannel?: OTPChannel;
  userId?: string;
  orderId?: string;
  autoVerify?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

interface OTPState {
  // Generation state
  isGenerating: boolean;
  isGenerated: boolean;
  
  // Verification state
  isVerifying: boolean;
  isVerified: boolean;
  
  // Resend state
  isResending: boolean;
  
  // Data
  otpId: string | null;
  currentChannel: OTPChannel | null;
  code: string;
  
  // Status
  attempts: number;
  maxAttempts: number;
  timeLeft: number;
  
  // Fallback options
  availableFallbacks: OTPChannel[];
  canResend: boolean;
  
  // Messages
  error: string | null;
  success: string | null;
}

interface OTPActions {
  generateOTP: (channel?: OTPChannel) => Promise<boolean>;
  verifyOTP: (code?: string) => Promise<boolean>;
  resendOTP: (fallbackChannel: OTPChannel) => Promise<boolean>;
  setCode: (code: string) => void;
  clearError: () => void;
  reset: () => void;
}

const initialState: OTPState = {
  isGenerating: false,
  isGenerated: false,
  isVerifying: false,
  isVerified: false,
  isResending: false,
  otpId: null,
  currentChannel: null,
  code: '',
  attempts: 0,
  maxAttempts: 3,
  timeLeft: 0,
  availableFallbacks: [],
  canResend: false,
  error: null,
  success: null,
};

export const useOTP = (options: UseOTPOptions): [OTPState, OTPActions] => {
  const [state, setState] = useState<OTPState>(initialState);

  // Timer for OTP expiration
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (state.timeLeft > 0) {
      timer = setTimeout(() => {
        setState(prev => ({ ...prev, timeLeft: prev.timeLeft - 1 }));
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [state.timeLeft]);

  const generateOTP = useCallback(async (channel?: OTPChannel): Promise<boolean> => {
    const selectedChannel = channel || options.preferredChannel || 'sms';
    
    setState(prev => ({
      ...prev,
      isGenerating: true,
      error: null,
      success: null
    }));

    try {
      const response = await fetch('/api/otp/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: options.phone,
          email: options.email,
          purpose: options.purpose,
          preferredChannel: selectedChannel,
          userId: options.userId,
          orderId: options.orderId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate OTP');
      }

      setState(prev => ({
        ...prev,
        isGenerating: false,
        isGenerated: true,
        otpId: data.otpId,
        currentChannel: data.channel,
        timeLeft: data.expiresIn || 300,
        canResend: data.fallbackAvailable || false,
        success: data.message,
        error: null
      }));

      return true;

    } catch (error: any) {
      const errorMessage = error.message || 'Failed to send OTP';
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: errorMessage
      }));
      
      options.onError?.(errorMessage);
      return false;
    }
  }, [options]);

  const verifyOTP = useCallback(async (code?: string): Promise<boolean> => {
    const otpCode = code || state.code;
    
    if (!otpCode || otpCode.length !== 6) {
      const errorMessage = 'Please enter a valid 6-digit code';
      setState(prev => ({ ...prev, error: errorMessage }));
      options.onError?.(errorMessage);
      return false;
    }

    setState(prev => ({
      ...prev,
      isVerifying: true,
      error: null
    }));

    try {
      const response = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          otpId: state.otpId,
          code: otpCode,
          channel: state.currentChannel
        })
      });

      const data = await response.json();

      if (!response.ok) {
        const newAttempts = state.attempts + 1;
        
        setState(prev => ({
          ...prev,
          isVerifying: false,
          attempts: newAttempts,
          error: data.message || 'Invalid OTP'
        }));

        // Check for fallback suggestion
        if (data.suggestFallback && data.nextFallbackChannel) {
          setState(prev => ({
            ...prev,
            availableFallbacks: [data.nextFallbackChannel],
            canResend: true
          }));
        }

        options.onError?.(data.message || 'Invalid OTP');
        return false;
      }

      setState(prev => ({
        ...prev,
        isVerifying: false,
        isVerified: true,
        success: data.message || 'OTP verified successfully',
        error: null
      }));

      const successData = {
        otpId: state.otpId,
        channel: state.currentChannel,
        verified: true
      };

      options.onSuccess?.(successData);
      return true;

    } catch (error: any) {
      const errorMessage = error.message || 'Verification failed';
      setState(prev => ({
        ...prev,
        isVerifying: false,
        attempts: prev.attempts + 1,
        error: errorMessage
      }));
      
      options.onError?.(errorMessage);
      return false;
    }
  }, [state.code, state.otpId, state.currentChannel, state.attempts, options]);

  const resendOTP = useCallback(async (fallbackChannel: OTPChannel): Promise<boolean> => {
    setState(prev => ({
      ...prev,
      isResending: true,
      error: null
    }));

    try {
      const response = await fetch('/api/otp/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          otpId: state.otpId,
          fallbackChannel
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend OTP');
      }

      setState(prev => ({
        ...prev,
        isResending: false,
        currentChannel: data.channel,
        timeLeft: data.expiresIn || 300,
        code: '', // Clear previous code
        attempts: 0, // Reset attempts for new channel
        success: data.message,
        error: null
      }));

      return true;

    } catch (error: any) {
      const errorMessage = error.message || 'Failed to resend OTP';
      setState(prev => ({
        ...prev,
        isResending: false,
        error: errorMessage
      }));
      
      options.onError?.(errorMessage);
      return false;
    }
  }, [state.otpId, options]);

  // Auto-verify when code is complete
  useEffect(() => {
    if (options.autoVerify && state.code.length === 6 && state.isGenerated && !state.isVerified) {
      verifyOTP();
    }
  }, [state.code, state.isGenerated, state.isVerified, options.autoVerify, verifyOTP]);

  const setCode = useCallback((code: string) => {
    // Only allow digits and limit to 6 characters
    const cleanCode = code.replace(/\D/g, '').slice(0, 6);
    setState(prev => ({ ...prev, code: cleanCode, error: null }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  const actions: OTPActions = {
    generateOTP,
    verifyOTP,
    resendOTP,
    setCode,
    clearError,
    reset
  };

  return [state, actions];
};

export default useOTP;