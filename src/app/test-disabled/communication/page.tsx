'use client';

import React, { useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Badge } from '../../../components/ui/badge';
import OTPChannelSelector from '../../../components/auth/OTPChannelSelector';
import CommunicationPreferencesComponent from '../../../components/profile/CommunicationPreferences';
import { useToast } from '../../../hooks/use-toast';
import { logger } from '../../../lib/logger';

export default function CommunicationTestPage() {
  const { toast } = useToast();
  const [testResults, setTestResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Test dual-channel OTP
  const testOTPDelivery = async (channel: 'sms' | 'email', contact: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/send-dual-channel-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel,
          [channel === 'email' ? 'email' : 'phone']: contact,
          purpose: 'signup'
        })
      });

      const result = await response.json();
      
      setTestResults(prev => [...prev, {
        type: 'OTP Delivery',
        channel,
        contact,
        success: response.ok,
        result,
        timestamp: new Date().toISOString()
      }]);

      toast({
        title: response.ok ? "OTP Sent" : "OTP Failed",
        description: result.message || result.error,
        variant: response.ok ? "default" : "destructive"
      });

      return { success: response.ok, error: result.error };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setTestResults(prev => [...prev, {
        type: 'OTP Delivery',
        channel,
        contact,
        success: false,
        result: { error: errorMsg },
        timestamp: new Date().toISOString()
      }]);

      toast({
        title: "OTP Error",
        description: errorMsg,
        variant: "destructive"
      });

      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  // Test WhatsApp notification
  const testWhatsAppNotification = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test/whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: '+919999999999',
          type: 'order_confirmation',
          data: {
            orderId: 'TEST-001',
            customerName: 'Test User',
            orderTotal: 99.99,
            items: [{ name: 'Test Product', quantity: 1, price: 99.99 }],
            orderDate: new Date().toLocaleDateString()
          }
        })
      });

      const result = await response.json();
      
      setTestResults(prev => [...prev, {
        type: 'WhatsApp Notification',
        success: response.ok,
        result,
        timestamp: new Date().toISOString()
      }]);

      toast({
        title: response.ok ? "WhatsApp Sent" : "WhatsApp Failed",
        description: result.message || result.error,
        variant: response.ok ? "default" : "destructive"
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "WhatsApp Error",
        description: errorMsg,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Test API endpoints
  const testEndpoints = async () => {
    setLoading(true);
    const endpoints = [
      '/api/products',
      '/api/user/communication-preferences?userId=test',
      '/api/auth/send-dual-channel-otp'
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint);
        const isHealthy = response.status !== 500;
        
        setTestResults(prev => [...prev, {
          type: 'API Health Check',
          endpoint,
          success: isHealthy,
          status: response.status,
          timestamp: new Date().toISOString()
        }]);
      } catch (error) {
        setTestResults(prev => [...prev, {
          type: 'API Health Check',
          endpoint,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }]);
      }
    }
    
    setLoading(false);
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">TecBunny Communication System Test</h1>
        <p className="text-gray-600 mt-2">Test dual-channel OTP, WhatsApp notifications, and system health</p>
      </div>

      <Tabs defaultValue="otp" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="otp">OTP Testing</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp Testing</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="health">System Health</TabsTrigger>
        </TabsList>

        <TabsContent value="otp" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dual-Channel OTP Testing</CardTitle>
              <CardDescription>Test SMS and Email OTP delivery with fallback functionality</CardDescription>
            </CardHeader>
            <CardContent>
              <OTPChannelSelector
                email="test@tecbunny.com"
                phone="+919999999999"
                purpose="signup"
                onChannelSelect={(channel, contact) => {
                  logger.info('communication_test.channel_selected', { channel, contact });
                }}
                onSendOTP={async (channel, contact) => {
                  if (channel === 'whatsapp') {
                    return { success: false, error: 'WhatsApp not implemented in test' };
                  }
                  return testOTPDelivery(channel as 'sms' | 'email', contact);
                }}
                disabled={loading}
                userPreferences={{
                  preferredChannel: 'email',
                  smsEnabled: true,
                  emailEnabled: true,
                  whatsappEnabled: false
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>WhatsApp Notification Testing</CardTitle>
              <CardDescription>Test transactional WhatsApp message delivery</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={testWhatsAppNotification}
                disabled={loading}
                className="w-full"
              >
                Send Test Order Confirmation
              </Button>
              <p className="text-sm text-gray-500">
                This will send a test order confirmation to the configured WhatsApp number
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Communication Preferences Testing</CardTitle>
              <CardDescription>Test user communication preference management</CardDescription>
            </CardHeader>
            <CardContent>
              <CommunicationPreferencesComponent
                userId="test-user-id"
                initialPreferences={{
                  preferredOTPChannel: 'email',
                  smsNotifications: true,
                  emailNotifications: true,
                  whatsappNotifications: true,
                  orderUpdates: true,
                  serviceUpdates: true,
                  securityAlerts: true,
                  phone: '+919999999999',
                  email: 'test@tecbunny.com'
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Health Check</CardTitle>
              <CardDescription>Check API endpoints and system components</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={testEndpoints}
                disabled={loading}
                className="w-full"
              >
                Run Health Check
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>Real-time testing results and system responses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {testResults.map((result, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{result.type}</span>
                    <div className="flex items-center space-x-2">
                      <Badge variant={result.success ? "default" : "destructive"}>
                        {result.success ? "SUCCESS" : "FAILED"}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  {result.channel && (
                    <p className="text-sm text-gray-600">Channel: {result.channel}</p>
                  )}
                  {result.contact && (
                    <p className="text-sm text-gray-600">Contact: {result.contact}</p>
                  )}
                  {result.endpoint && (
                    <p className="text-sm text-gray-600">Endpoint: {result.endpoint}</p>
                  )}
                  <pre className="text-xs bg-gray-50 p-2 rounded mt-2 overflow-x-auto">
                    {JSON.stringify(result.result, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}