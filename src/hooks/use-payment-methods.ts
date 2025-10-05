import { useState, useEffect } from 'react';

import { logger } from '../lib/logger';

export interface PaymentMethod {
  id: string;
  name: string;
  type: 'online' | 'offline';
  enabled: boolean;
  config?: {
    keyId?: string;
    secretKey?: string;
    merchantId?: string;
    saltKey?: string;
    saltIndex?: string;
    appId?: string;
    publishableKey?: string;
    merchantKey?: string;
    websiteName?: string;
    industryType?: string;
    channelId?: string;
    environment?: string;
    // COD specific
    minOrderAmount?: string;
    maxOrderAmount?: string;
    instructions?: string;
    // UPI specific
    upiId?: string;
    upiName?: string;
  };
}

export interface PaymentSettings {
  razorpay: PaymentMethod;
  stripe: PaymentMethod;
  phonepe: PaymentMethod;
  paytm: PaymentMethod;
  cashfree: PaymentMethod;
  cod: PaymentMethod;
  upi: PaymentMethod;
}

const defaultPaymentSettings: PaymentSettings = {
  razorpay: {
    id: 'razorpay',
    name: 'Razorpay',
    type: 'online',
    enabled: true,
    config: {}
  },
  stripe: {
    id: 'stripe',
    name: 'Stripe',
    type: 'online',
    enabled: false,
    config: {}
  },
  phonepe: {
    id: 'phonepe',
    name: 'PhonePe',
    type: 'online',
    enabled: false,
    config: {}
  },
  paytm: {
    id: 'paytm',
    name: 'Paytm',
    type: 'online',
    enabled: false,
    config: {}
  },
  cashfree: {
    id: 'cashfree',
    name: 'Cashfree',
    type: 'online',
    enabled: false,
    config: {}
  },
  cod: {
    id: 'cod',
    name: 'Cash on Delivery',
    type: 'offline',
    enabled: true,
    config: {}
  },
  upi: {
    id: 'upi',
    name: 'UPI/QR Code',
    type: 'offline',
    enabled: true,
    config: {}
  }
};

export function usePaymentMethods() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentSettings>(defaultPaymentSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPaymentSettings = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/admin/payment-settings');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.paymentSettings) {
        setPaymentMethods(data.paymentSettings);
      } else {
        setPaymentMethods(defaultPaymentSettings);
      }
    } catch (err) {
      logger.error('Error fetching payment settings:', { error: err });
      setError(err instanceof Error ? err.message : 'Failed to fetch payment settings');
      setPaymentMethods(defaultPaymentSettings);
    } finally {
      setLoading(false);
    }
  };

  const updatePaymentMethod = async (methodId: string, updates: Partial<PaymentMethod>) => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/admin/payment-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ methodId, updates })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.method) {
        // Update local state
        setPaymentMethods(prev => ({
          ...prev,
          [methodId]: data.method
        }));
      }

      return { success: true };
    } catch (err) {
      logger.error('Error updating payment method:', { error: err });
      setError(err instanceof Error ? err.message : 'Failed to update payment method');
      return { success: false, error: err instanceof Error ? err.message : 'Update failed' };
    } finally {
      setLoading(false);
    }
  };

  const getEnabledPaymentMethods = () => {
    return Object.values(paymentMethods).filter(method => method.enabled);
  };

  const getOnlinePaymentMethods = () => {
    return Object.values(paymentMethods).filter(method => method.enabled && method.type === 'online');
  };

  const getOfflinePaymentMethods = () => {
    return Object.values(paymentMethods).filter(method => method.enabled && method.type === 'offline');
  };

  useEffect(() => {
    fetchPaymentSettings();
  }, []);

  return {
    paymentMethods,
    loading,
    error,
    updatePaymentMethod,
    fetchPaymentSettings,
    getEnabledPaymentMethods,
    getOnlinePaymentMethods,
    getOfflinePaymentMethods
  };
}