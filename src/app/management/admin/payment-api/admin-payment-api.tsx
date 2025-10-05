
'use client';

import * as React from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import { Textarea } from '../../../../components/ui/textarea';
import { Switch } from '../../../../components/ui/switch';
import { useToast } from '../../../../hooks/use-toast';
import { usePaymentMethods } from '../../../../hooks/use-payment-methods';

export default function PaymentApiPage() {
  const { toast } = useToast();
  const { paymentMethods, loading, updatePaymentMethod } = usePaymentMethods();

  const [formData, setFormData] = React.useState({
    razorpay: {
      enabled: false,
      keyId: '',
      secretKey: ''
    },
    stripe: {
      enabled: false,
      publishableKey: '',
      secretKey: ''
    },
    phonepe: {
      enabled: false,
      merchantId: '',
      saltKey: '',
      saltIndex: ''
    },
    paytm: {
      enabled: false,
      merchantId: '',
      merchantKey: '',
      websiteName: '',
      industryType: '',
      channelId: '',
      environment: 'staging'
    },
    cashfree: {
      enabled: false,
      appId: '',
      secretKey: ''
    },
    cod: {
      enabled: true,
      minOrderAmount: '',
      maxOrderAmount: '',
      instructions: ''
    },
    upi: {
      enabled: true,
      upiId: '',
      upiName: '',
      instructions: ''
    }
  });

  const [savingStates, setSavingStates] = React.useState({
    razorpay: false,
    stripe: false,
    phonepe: false,
    paytm: false,
    cashfree: false,
    cod: false,
    upi: false
  });

  // Update form data when payment methods are loaded
  React.useEffect(() => {
    if (!loading && paymentMethods) {
      setFormData({
        razorpay: {
          enabled: paymentMethods.razorpay?.enabled || false,
          keyId: paymentMethods.razorpay?.config?.keyId || '',
          secretKey: paymentMethods.razorpay?.config?.secretKey || ''
        },
        stripe: {
          enabled: paymentMethods.stripe?.enabled || false,
          publishableKey: paymentMethods.stripe?.config?.publishableKey || '',
          secretKey: paymentMethods.stripe?.config?.secretKey || ''
        },
        phonepe: {
          enabled: paymentMethods.phonepe?.enabled || false,
          merchantId: paymentMethods.phonepe?.config?.merchantId || '',
          saltKey: paymentMethods.phonepe?.config?.saltKey || '',
          saltIndex: paymentMethods.phonepe?.config?.saltIndex || ''
        },
        paytm: {
          enabled: paymentMethods.paytm?.enabled || false,
          merchantId: paymentMethods.paytm?.config?.merchantId || '',
          merchantKey: paymentMethods.paytm?.config?.merchantKey || '',
          websiteName: paymentMethods.paytm?.config?.websiteName || '',
          industryType: paymentMethods.paytm?.config?.industryType || '',
          channelId: paymentMethods.paytm?.config?.channelId || '',
          environment: paymentMethods.paytm?.config?.environment || 'staging'
        },
        cashfree: {
          enabled: paymentMethods.cashfree?.enabled || false,
          appId: paymentMethods.cashfree?.config?.appId || '',
          secretKey: paymentMethods.cashfree?.config?.secretKey || ''
        },
        cod: {
          enabled: paymentMethods.cod?.enabled || true,
          minOrderAmount: paymentMethods.cod?.config?.minOrderAmount || '',
          maxOrderAmount: paymentMethods.cod?.config?.maxOrderAmount || '',
          instructions: paymentMethods.cod?.config?.instructions || ''
        },
        upi: {
          enabled: paymentMethods.upi?.enabled || true,
          upiId: paymentMethods.upi?.config?.upiId || '',
          upiName: paymentMethods.upi?.config?.upiName || '',
          instructions: paymentMethods.upi?.config?.instructions || ''
        }
      });
    }
  }, [loading, paymentMethods]);

  const handleSaveRazorpay = async () => {
    setSavingStates(prev => ({ ...prev, razorpay: true }));
    try {
      const result = await updatePaymentMethod('razorpay', {
        enabled: formData.razorpay.enabled,
        config: {
          keyId: formData.razorpay.keyId,
          secretKey: formData.razorpay.secretKey
        }
      });

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Razorpay settings saved successfully'
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to save Razorpay settings',
          variant: 'destructive'
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setSavingStates(prev => ({ ...prev, razorpay: false }));
    }
  };

  const handleSaveStripe = async () => {
    setSavingStates(prev => ({ ...prev, stripe: true }));
    try {
      const result = await updatePaymentMethod('stripe', {
        enabled: formData.stripe.enabled,
        config: {
          publishableKey: formData.stripe.publishableKey,
          secretKey: formData.stripe.secretKey
        }
      });

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Stripe settings saved successfully'
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to save Stripe settings',
          variant: 'destructive'
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setSavingStates(prev => ({ ...prev, stripe: false }));
    }
  };

  const handleSavePhonePe = async () => {
    setSavingStates(prev => ({ ...prev, phonepe: true }));
    try {
      const result = await updatePaymentMethod('phonepe', {
        enabled: formData.phonepe.enabled,
        config: {
          merchantId: formData.phonepe.merchantId,
          saltKey: formData.phonepe.saltKey,
          saltIndex: formData.phonepe.saltIndex
        }
      });

      if (result.success) {
        toast({
          title: 'Success',
          description: 'PhonePe settings saved successfully'
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to save PhonePe settings',
          variant: 'destructive'
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setSavingStates(prev => ({ ...prev, phonepe: false }));
    }
  };

  const handleSavePaytm = async () => {
    setSavingStates(prev => ({ ...prev, paytm: true }));
    try {
      const result = await updatePaymentMethod('paytm', {
        enabled: formData.paytm.enabled,
        config: {
          merchantId: formData.paytm.merchantId,
          merchantKey: formData.paytm.merchantKey,
          websiteName: formData.paytm.websiteName,
          industryType: formData.paytm.industryType,
          channelId: formData.paytm.channelId,
          environment: formData.paytm.environment
        }
      });

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Paytm settings saved successfully'
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to save Paytm settings',
          variant: 'destructive'
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setSavingStates(prev => ({ ...prev, paytm: false }));
    }
  };

  const handleSaveCashfree = async () => {
    setSavingStates(prev => ({ ...prev, cashfree: true }));
    try {
      const result = await updatePaymentMethod('cashfree', {
        enabled: formData.cashfree.enabled,
        config: {
          appId: formData.cashfree.appId,
          secretKey: formData.cashfree.secretKey
        }
      });

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Cashfree settings saved successfully'
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to save Cashfree settings',
          variant: 'destructive'
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setSavingStates(prev => ({ ...prev, cashfree: false }));
    }
  };

  const handleSaveCOD = async () => {
    setSavingStates(prev => ({ ...prev, cod: true }));
    try {
      const result = await updatePaymentMethod('cod', {
        enabled: formData.cod.enabled,
        config: {
          minOrderAmount: formData.cod.minOrderAmount,
          maxOrderAmount: formData.cod.maxOrderAmount,
          instructions: formData.cod.instructions
        }
      });

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Cash on Delivery settings saved successfully'
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to save COD settings',
          variant: 'destructive'
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setSavingStates(prev => ({ ...prev, cod: false }));
    }
  };

  const handleSaveUPI = async () => {
    setSavingStates(prev => ({ ...prev, upi: true }));
    try {
      const result = await updatePaymentMethod('upi', {
        enabled: formData.upi.enabled,
        config: {
          upiId: formData.upi.upiId,
          upiName: formData.upi.upiName,
          instructions: formData.upi.instructions
        }
      });

      if (result.success) {
        toast({
          title: 'Success',
          description: 'UPI settings saved successfully'
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to save UPI settings',
          variant: 'destructive'
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setSavingStates(prev => ({ ...prev, upi: false }));
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Payment API Settings</h1>
          <p className="text-muted-foreground">Loading payment configuration...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Payment API Settings</h1>
        <p className="text-muted-foreground">
          Connect and configure your payment gateways.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Razorpay</CardTitle>
          <CardDescription>
            Configure your Razorpay integration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                    <Label>Enable Razorpay</Label>
                    <p className="text-xs text-muted-foreground">Allow customers to pay using Razorpay.</p>
                </div>
                <Switch 
                  checked={formData.razorpay.enabled}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, razorpay: { ...prev.razorpay, enabled: checked } }))
                  }
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="razorpay-key-id">Key ID</Label>
                <Input 
                  id="razorpay-key-id" 
                  type="text" 
                  value={formData.razorpay.keyId}
                  onChange={(e) => 
                    setFormData(prev => ({ ...prev, razorpay: { ...prev.razorpay, keyId: e.target.value } }))
                  }
                  placeholder="rzp_test_..." 
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="razorpay-key-secret">Key Secret</Label>
                <Input 
                  id="razorpay-key-secret" 
                  type="password" 
                  value={formData.razorpay.secretKey}
                  onChange={(e) => 
                    setFormData(prev => ({ ...prev, razorpay: { ...prev.razorpay, secretKey: e.target.value } }))
                  }
                  placeholder="Enter your secret key" 
                />
            </div>
            <Button onClick={handleSaveRazorpay} disabled={savingStates.razorpay}>
              {savingStates.razorpay ? 'Saving...' : 'Save Razorpay Settings'}
            </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Stripe</CardTitle>
           <CardDescription>
            Configure your Stripe integration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                    <Label>Enable Stripe</Label>
                     <p className="text-xs text-muted-foreground">Allow customers to pay using Stripe.</p>
                </div>
                <Switch 
                  checked={formData.stripe.enabled}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({
                      ...prev,
                      stripe: { ...prev.stripe, enabled: checked }
                    }))
                  }
                />
            </div>
             <div className="space-y-2">
                <Label htmlFor="stripe-pk">Publishable Key</Label>
                <Input 
                  id="stripe-pk" 
                  placeholder="pk_test_..."
                  value={formData.stripe.publishableKey}
                  onChange={(e) => 
                    setFormData(prev => ({
                      ...prev,
                      stripe: { ...prev.stripe, publishableKey: e.target.value }
                    }))
                  }
                />
            </div>
             <div className="space-y-2">
                <Label htmlFor="stripe-sk">Secret Key</Label>
                <Input 
                  id="stripe-sk" 
                  type="password" 
                  placeholder="sk_test_..."
                  value={formData.stripe.secretKey}
                  onChange={(e) => 
                    setFormData(prev => ({
                      ...prev,
                      stripe: { ...prev.stripe, secretKey: e.target.value }
                    }))
                  }
                />
            </div>
            <Button onClick={handleSaveStripe} disabled={savingStates.stripe}>
              {savingStates.stripe ? 'Saving...' : 'Save Stripe Settings'}
            </Button>
        </CardContent>
      </Card>
       <Card>
        <CardHeader>
          <CardTitle>PhonePe</CardTitle>
           <CardDescription>
            Configure your PhonePe integration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                    <Label>Enable PhonePe</Label>
                     <p className="text-xs text-muted-foreground">Allow customers to pay using PhonePe.</p>
                </div>
                <Switch 
                  checked={formData.phonepe.enabled}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({
                      ...prev,
                      phonepe: { ...prev.phonepe, enabled: checked }
                    }))
                  }
                />
            </div>
             <div className="space-y-2">
                <Label htmlFor="phonepe-merchant-id">Merchant ID</Label>
                <Input 
                  id="phonepe-merchant-id" 
                  placeholder="e.g., PGTESTPAYUAT"
                  value={formData.phonepe.merchantId}
                  onChange={(e) => 
                    setFormData(prev => ({
                      ...prev,
                      phonepe: { ...prev.phonepe, merchantId: e.target.value }
                    }))
                  }
                />
            </div>
             <div className="space-y-2">
                <Label htmlFor="phonepe-salt-key">Salt Key</Label>
                <Input 
                  id="phonepe-salt-key" 
                  type="password" 
                  placeholder="e.g., 099eb0cd-029e-4b..."
                  value={formData.phonepe.saltKey}
                  onChange={(e) => 
                    setFormData(prev => ({
                      ...prev,
                      phonepe: { ...prev.phonepe, saltKey: e.target.value }
                    }))
                  }
                />
            </div>
             <div className="space-y-2">
                <Label htmlFor="phonepe-salt-index">Salt Index</Label>
                <Input 
                  id="phonepe-salt-index" 
                  placeholder="e.g., 1"
                  value={formData.phonepe.saltIndex}
                  onChange={(e) => 
                    setFormData(prev => ({
                      ...prev,
                      phonepe: { ...prev.phonepe, saltIndex: e.target.value }
                    }))
                  }
                />
            </div>
            <Button onClick={handleSavePhonePe} disabled={savingStates.phonepe}>
              {savingStates.phonepe ? 'Saving...' : 'Save PhonePe Settings'}
            </Button>
        </CardContent>
      </Card>
       <Card>
        <CardHeader>
          <CardTitle>Paytm</CardTitle>
           <CardDescription>
            Configure your Paytm integration for Indian payment processing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                    <Label>Enable Paytm</Label>
                     <p className="text-xs text-muted-foreground">Allow customers to pay using Paytm.</p>
                </div>
                <Switch 
                  checked={formData.paytm.enabled}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({
                      ...prev,
                      paytm: { ...prev.paytm, enabled: checked }
                    }))
                  }
                />
            </div>
             <div className="space-y-2">
                <Label htmlFor="paytm-merchant-id">Merchant ID</Label>
                <Input 
                  id="paytm-merchant-id" 
                  placeholder="e.g., PAYTM12345678901234"
                  value={formData.paytm.merchantId}
                  onChange={(e) => 
                    setFormData(prev => ({
                      ...prev,
                      paytm: { ...prev.paytm, merchantId: e.target.value }
                    }))
                  }
                />
            </div>
             <div className="space-y-2">
                <Label htmlFor="paytm-merchant-key">Merchant Key</Label>
                <Input 
                  id="paytm-merchant-key" 
                  type="password" 
                  placeholder="Enter your merchant key"
                  value={formData.paytm.merchantKey}
                  onChange={(e) => 
                    setFormData(prev => ({
                      ...prev,
                      paytm: { ...prev.paytm, merchantKey: e.target.value }
                    }))
                  }
                />
            </div>
             <div className="space-y-2">
                <Label htmlFor="paytm-website-name">Website Name</Label>
                <Input 
                  id="paytm-website-name" 
                  placeholder="e.g., WEBSTAGING (staging) or DEFAULT (production)"
                  value={formData.paytm.websiteName}
                  onChange={(e) => 
                    setFormData(prev => ({
                      ...prev,
                      paytm: { ...prev.paytm, websiteName: e.target.value }
                    }))
                  }
                />
            </div>
             <div className="space-y-2">
                <Label htmlFor="paytm-industry-type">Industry Type</Label>
                <Input 
                  id="paytm-industry-type" 
                  placeholder="e.g., Retail"
                  value={formData.paytm.industryType}
                  onChange={(e) => 
                    setFormData(prev => ({
                      ...prev,
                      paytm: { ...prev.paytm, industryType: e.target.value }
                    }))
                  }
                />
            </div>
             <div className="space-y-2">
                <Label htmlFor="paytm-channel-id">Channel ID</Label>
                <Input 
                  id="paytm-channel-id" 
                  placeholder="e.g., WEB"
                  value={formData.paytm.channelId}
                  onChange={(e) => 
                    setFormData(prev => ({
                      ...prev,
                      paytm: { ...prev.paytm, channelId: e.target.value }
                    }))
                  }
                />
            </div>
             <div className="space-y-2">
                <Label htmlFor="paytm-environment">Environment</Label>
                <select
                  id="paytm-environment"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.paytm.environment}
                  onChange={(e) => 
                    setFormData(prev => ({
                      ...prev,
                      paytm: { ...prev.paytm, environment: e.target.value }
                    }))
                  }
                >
                  <option value="staging">Staging (Test)</option>
                  <option value="production">Production (Live)</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Use Staging for testing, Production for live transactions
                </p>
            </div>
            <Button onClick={handleSavePaytm} disabled={savingStates.paytm}>
              {savingStates.paytm ? 'Saving...' : 'Save Paytm Settings'}
            </Button>
        </CardContent>
      </Card>
       <Card>
        <CardHeader>
          <CardTitle>Cashfree</CardTitle>
           <CardDescription>
            Configure your Cashfree integration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                    <Label>Enable Cashfree</Label>
                     <p className="text-xs text-muted-foreground">Allow customers to pay using Cashfree.</p>
                </div>
                <Switch 
                  checked={formData.cashfree.enabled}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({
                      ...prev,
                      cashfree: { ...prev.cashfree, enabled: checked }
                    }))
                  }
                />
            </div>
             <div className="space-y-2">
                <Label htmlFor="cashfree-app-id">App ID</Label>
                <Input 
                  id="cashfree-app-id" 
                  placeholder="e.g., 1234567890abcdef"
                  value={formData.cashfree.appId}
                  onChange={(e) => 
                    setFormData(prev => ({
                      ...prev,
                      cashfree: { ...prev.cashfree, appId: e.target.value }
                    }))
                  }
                />
            </div>
             <div className="space-y-2">
                <Label htmlFor="cashfree-secret-key">Secret Key</Label>
                <Input 
                  id="cashfree-secret-key" 
                  type="password" 
                  placeholder="e.g., cf_sk_123..."
                  value={formData.cashfree.secretKey}
                  onChange={(e) => 
                    setFormData(prev => ({
                      ...prev,
                      cashfree: { ...prev.cashfree, secretKey: e.target.value }
                    }))
                  }
                />
            </div>
            <Button onClick={handleSaveCashfree} disabled={savingStates.cashfree}>
              {savingStates.cashfree ? 'Saving...' : 'Save Cashfree Settings'}
            </Button>
        </CardContent>
      </Card>

      {/* Cash on Delivery (COD) Section */}
      <Card>
        <CardHeader>
          <CardTitle>Cash on Delivery (COD)</CardTitle>
          <CardDescription>
            Configure cash on delivery payment option for your customers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>Enable Cash on Delivery</Label>
              <p className="text-xs text-muted-foreground">Allow customers to pay with cash upon delivery.</p>
            </div>
            <Switch 
              checked={formData.cod.enabled}
              onCheckedChange={(checked) => 
                setFormData(prev => ({
                  ...prev,
                  cod: { ...prev.cod, enabled: checked }
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cod-min-amount">Minimum Order Amount (₹)</Label>
            <Input 
              id="cod-min-amount" 
              type="number"
              placeholder="e.g., 0 (optional)"
              value={formData.cod.minOrderAmount}
              onChange={(e) => 
                setFormData(prev => ({
                  ...prev,
                  cod: { ...prev.cod, minOrderAmount: e.target.value }
                }))
              }
            />
            <p className="text-xs text-muted-foreground">
              Leave empty for no minimum order amount
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cod-max-amount">Maximum Order Amount (₹)</Label>
            <Input 
              id="cod-max-amount" 
              type="number"
              placeholder="e.g., 50000 (optional)"
              value={formData.cod.maxOrderAmount}
              onChange={(e) => 
                setFormData(prev => ({
                  ...prev,
                  cod: { ...prev.cod, maxOrderAmount: e.target.value }
                }))
              }
            />
            <p className="text-xs text-muted-foreground">
              Leave empty for no maximum order amount
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cod-instructions">Instructions for Customers</Label>
            <Textarea 
              id="cod-instructions" 
              placeholder="e.g., Please keep exact change ready. Our delivery partner will collect the payment."
              value={formData.cod.instructions}
              rows={3}
              onChange={(e) => 
                setFormData(prev => ({
                  ...prev,
                  cod: { ...prev.cod, instructions: e.target.value }
                }))
              }
            />
          </div>
          <Button onClick={handleSaveCOD} disabled={savingStates.cod}>
            {savingStates.cod ? 'Saving...' : 'Save COD Settings'}
          </Button>
        </CardContent>
      </Card>

      {/* UPI Section */}
      <Card>
        <CardHeader>
          <CardTitle>UPI / QR Code Payment</CardTitle>
          <CardDescription>
            Configure UPI payment option for manual QR code payments.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>Enable UPI Payments</Label>
              <p className="text-xs text-muted-foreground">Allow customers to pay via UPI/QR code.</p>
            </div>
            <Switch 
              checked={formData.upi.enabled}
              onCheckedChange={(checked) => 
                setFormData(prev => ({
                  ...prev,
                  upi: { ...prev.upi, enabled: checked }
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="upi-id">UPI ID</Label>
            <Input 
              id="upi-id" 
              placeholder="e.g., yourstore@paytm or 9876543210@ybl"
              value={formData.upi.upiId}
              onChange={(e) => 
                setFormData(prev => ({
                  ...prev,
                  upi: { ...prev.upi, upiId: e.target.value }
                }))
              }
            />
            <p className="text-xs text-muted-foreground">
              Your UPI ID for receiving payments (e.g., merchantname@paytm)
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="upi-name">Account Holder Name</Label>
            <Input 
              id="upi-name" 
              placeholder="e.g., TecBunny Solutions"
              value={formData.upi.upiName}
              onChange={(e) => 
                setFormData(prev => ({
                  ...prev,
                  upi: { ...prev.upi, upiName: e.target.value }
                }))
              }
            />
            <p className="text-xs text-muted-foreground">
              Name that appears on the UPI account
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="upi-instructions">Payment Instructions</Label>
            <Textarea 
              id="upi-instructions" 
              placeholder="e.g., Scan the QR code and complete the payment. Share the transaction screenshot/ID with us."
              value={formData.upi.instructions}
              rows={3}
              onChange={(e) => 
                setFormData(prev => ({
                  ...prev,
                  upi: { ...prev.upi, instructions: e.target.value }
                }))
              }
            />
            <p className="text-xs text-muted-foreground">
              Instructions shown to customers during UPI payment
            </p>
          </div>
          <Button onClick={handleSaveUPI} disabled={savingStates.upi}>
            {savingStates.upi ? 'Saving...' : 'Save UPI Settings'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}