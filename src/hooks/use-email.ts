import { useState } from 'react';

import { useToast } from '../hooks/use-toast';

interface EmailHookOptions {
  showToast?: boolean;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function useEmail(options: EmailHookOptions = {}) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { showToast = true, onSuccess, onError } = options;

  const sendEmail = async (endpoint: string, data: any) => {
    setLoading(true);
    
    try {
      const response = await fetch(`/api/email/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send email');
      }

      if (showToast) {
        toast({
          title: "Email Sent",
          description: result.message || "Email sent successfully",
        });
      }

      onSuccess?.();
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send email';
      
      if (showToast) {
        toast({
          title: "Email Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }

      onError?.(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const emailHelpers = {
    sendEmailVerification: (to: string, userName: string, otp: string) =>
      sendEmail('verification', { to, userName, otp }),

    sendWelcomeEmail: (to: string, userName: string) =>
      sendEmail('welcome', { to, userName }),

    sendOrderConfirmation: (to: string, orderData: any) =>
      sendEmail('order-confirmation', { to, orderData }),

    sendPaymentConfirmation: (to: string, orderData: any, paymentData: any) =>
      sendEmail('payment-confirmation', { to, orderData, paymentData }),

    sendShippingNotification: (to: string, orderData: any, shippingData: any) =>
      sendEmail('shipping', { to, orderData, shippingData }),

    sendPickupNotification: (to: string, orderData: any, pickupCode: string) =>
      sendEmail('pickup', { to, orderData, pickupCode }),

    sendOrderCompletion: (to: string, orderData: any) =>
      sendEmail('order-completion', { to, orderData }),

    sendPasswordResetOTP: (to: string, userName: string, otp: string) =>
      sendEmail('password-reset', { to, userName, otp }),

    sendEmailChangeOTP: (to: string, userName: string, otp: string) =>
      sendEmail('email-change', { to, userName, otp }),
  };

  return {
    loading,
    sendEmail,
    ...emailHelpers,
  };
}