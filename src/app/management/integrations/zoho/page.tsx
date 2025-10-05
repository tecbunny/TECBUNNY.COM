'use client';

import React, { useState, useEffect } from 'react';

import { Loader2, CheckCircle, XCircle, ExternalLink, RefreshCw, Upload, Download } from 'lucide-react';

import { Button } from '../../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/tabs';
import { Alert, AlertDescription } from '../../../../components/ui/alert';
import { Badge } from '../../../../components/ui/badge';

interface SyncStatus {
  local_products: number;
  zoho_items: number;
  sync_status: string;
  last_sync: string | null;
}

export default function ZohoIntegrationPage() {
  const [activeTab, setActiveTab] = useState('setup');
  const [loading, setLoading] = useState(false);
  const [authURL, setAuthURL] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncResults, setSyncResults] = useState<any>(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Get Zoho authorization URL
  const getAuthURL = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/zoho/auth');
      const data = await response.json();
      
      if (response.ok) {
        setAuthURL(data.authURL);
        setMessage({ type: 'success', text: 'Authorization URL generated. Click to authenticate with Zoho.' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to get authorization URL' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error getting authorization URL' });
    } finally {
      setLoading(false);
    }
  };

  // Exchange authorization code for tokens
  const exchangeAuthCode = async () => {
    if (!authCode.trim()) {
      setMessage({ type: 'error', text: 'Please enter the authorization code' });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/zoho/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: authCode.trim() })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Authentication successful! You can now use Zoho integration.' });
        setAuthCode('');
        setActiveTab('sync');
      } else {
        setMessage({ type: 'error', text: data.error || 'Authentication failed' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error during authentication' });
    } finally {
      setLoading(false);
    }
  };

  // Get sync status
  const getSyncStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/zoho/sync');
      const data = await response.json();
      
      if (response.ok) {
        setSyncStatus(data);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to get sync status' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error getting sync status' });
    } finally {
      setLoading(false);
    }
  };

  // Sync products
  const syncProducts = async (direction: 'to_zoho' | 'from_zoho') => {
    try {
      setLoading(true);
      setSyncResults(null);
      
      const response = await fetch('/api/zoho/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSyncResults(data);
        setMessage({ 
          type: 'success', 
          text: `${data.message}. ${data.success.length} successful, ${data.errors.length} errors.` 
        });
        // Refresh sync status
        await getSyncStatus();
      } else {
        setMessage({ type: 'error', text: data.error || 'Sync failed' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error during sync' });
    } finally {
      setLoading(false);
    }
  };

  // Load sync status on component mount
  useEffect(() => {
    getSyncStatus();
    
    // Check for authorization code in URL parameters (from OAuth redirect)
    const urlParams = new URLSearchParams(window.location.search);
    const codeFromUrl = urlParams.get('code');
    const errorFromUrl = urlParams.get('error');
    
    if (errorFromUrl) {
      setMessage({ type: 'error', text: `Authorization failed: ${errorFromUrl}` });
    } else if (codeFromUrl) {
      setAuthCode(codeFromUrl);
      setMessage({ type: 'success', text: 'Authorization code received! Click "Complete Authentication" to finish.' });
      setActiveTab('setup');
      // Clean the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Zoho Inventory Integration</h1>
        <p className="text-gray-600 mt-2">
          Sync your TecBunny Store inventory with Zoho Inventory for seamless management
        </p>
      </div>

      {message.text && (
        <Alert className={`mb-6 ${message.type === 'error' ? 'border-red-500' : 'border-green-500'}`}>
          <AlertDescription className={message.type === 'error' ? 'text-red-700' : 'text-green-700'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="setup">Setup</TabsTrigger>
          <TabsTrigger value="sync">Sync</TabsTrigger>
          <TabsTrigger value="status">Status</TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Zoho Authentication Setup</CardTitle>
              <CardDescription>
                Connect your TecBunny Store with Zoho Inventory
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Step 1: Get Authorization URL</Label>
                <div className="flex gap-2">
                  <Button onClick={getAuthURL} disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Generate Auth URL
                  </Button>
                  {authURL && (
                    <Button variant="outline" asChild>
                      <a href={authURL} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open Zoho Auth
                      </a>
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="authCode">Step 2: Enter Authorization Code</Label>
                <Input
                  id="authCode"
                  placeholder="Paste the authorization code from Zoho here"
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value)}
                />
                <Button onClick={exchangeAuthCode} disabled={loading || !authCode.trim()}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Complete Authentication
                </Button>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Setup Instructions:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                  <li>Click "Generate Auth URL" above</li>
                  <li>Click "Open Zoho Auth" to go to Zoho</li>
                  <li>Log in to your Zoho account and authorize the app</li>
                  <li>Copy the authorization code from the redirect URL</li>
                  <li>Paste it in the field above and click "Complete Authentication"</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sync" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Product Synchronization</CardTitle>
              <CardDescription>
                Sync products between TecBunny Store and Zoho Inventory
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {syncStatus && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <Label className="text-sm text-gray-600">TecBunny Products</Label>
                    <p className="text-2xl font-bold">{syncStatus.local_products}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Zoho Items</Label>
                    <p className="text-2xl font-bold">{syncStatus.zoho_items}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  onClick={() => syncProducts('to_zoho')} 
                  disabled={loading}
                  className="h-20 flex-col"
                >
                  <Upload className="w-6 h-6 mb-2" />
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sync TO Zoho'}
                  <span className="text-xs">Push products to Zoho Inventory</span>
                </Button>

                <Button 
                  onClick={() => syncProducts('from_zoho')} 
                  disabled={loading}
                  variant="outline"
                  className="h-20 flex-col"
                >
                  <Download className="w-6 h-6 mb-2" />
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sync FROM Zoho'}
                  <span className="text-xs">Pull products from Zoho Inventory</span>
                </Button>
              </div>

              {syncResults && (
                <Card>
                  <CardHeader>
                    <CardTitle>Sync Results</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>Successful: {syncResults.success.length}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-red-500" />
                        <span>Errors: {syncResults.errors.length}</span>
                      </div>
                      
                      {syncResults.errors.length > 0 && (
                        <details className="mt-4">
                          <summary className="cursor-pointer text-sm font-medium">View Errors</summary>
                          <div className="mt-2 space-y-1">
                            {syncResults.errors.map((error: any, index: number) => (
                              <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                                Product {error.product}: {error.error}
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Integration Status</CardTitle>
              <CardDescription>
                Monitor your Zoho Inventory integration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={getSyncStatus} disabled={loading}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Status
              </Button>

              {syncStatus && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <Label className="text-sm text-gray-600">TecBunny Products</Label>
                          <p className="text-3xl font-bold text-blue-600">{syncStatus.local_products}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <Label className="text-sm text-gray-600">Zoho Items</Label>
                          <p className="text-3xl font-bold text-green-600">{syncStatus.zoho_items}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <Label className="text-sm text-gray-600">Status</Label>
                          <Badge variant="default" className="mt-2">
                            {syncStatus.sync_status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardContent className="p-4">
                      <Label className="text-sm text-gray-600">Last Sync</Label>
                      <p className="text-lg">
                        {syncStatus.last_sync ? new Date(syncStatus.last_sync).toLocaleString() : 'Never'}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}