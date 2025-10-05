'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Palette, Building, FileText, Globe, Settings, Share2 } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '../../../../components/ui/form';
import { Input } from '../../../../components/ui/input';
import { useToast } from '../../../../hooks/use-toast';
import { Textarea } from '../../../../components/ui/textarea';
import { createClient } from '../../../../lib/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/tabs';
import { Label } from '../../../../components/ui/label';
import { Switch } from '../../../../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { logger } from '../../../../lib/logger';

const settingsSchema = z.object({
  // Site Identity
  siteName: z.string().min(1, "Site name is required"),
  tagline: z.string().optional(),
  logoUrl: z.string().optional(),
  faviconUrl: z.string().optional(),
  
  // Color Scheme
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color"),
  secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color"),
  accentColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color"),
  
  // Homepage Settings
  heroTitle: z.string().min(1, "Hero title is required"),
  heroSubtitle: z.string().optional(),
  heroButtonText: z.string().min(1, "Hero button text is required"),
  heroButtonLink: z.string().min(1, "Hero button link is required"),
  featuredProductId: z.string().optional(),
  
  // Banner Settings
  topBannerEnabled: z.boolean().default(false),
  topBannerText: z.string().optional(),
  topBannerLink: z.string().optional(),
  topBannerImage: z.string().optional(),
  sideBannerEnabled: z.boolean().default(false),
  sideBannerImage: z.string().optional(),
  sideBannerLink: z.string().optional(),
  
  // Business Details
  companyName: z.string().min(1, "Company name is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  pincode: z.string().min(1, "Pincode is required"),
  country: z.string().min(1, "Country is required"),
  
  // Contact Information
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email("Invalid email address"),
  website: z.string().url("Invalid website URL"),
  
  // Business Registration
  gstin: z.string().optional(),
  pan: z.string().optional(),
  cin: z.string().optional(),
  businessType: z.string().min(1, "Business type is required"),
  
  // Additional Settings
  currency: z.string().min(1, "Currency is required"),
  timezone: z.string().min(1, "Timezone is required"),
  enableGST: z.boolean().default(false),
  
  // Category-based GST Rates
  categoryGstRates: z.record(z.string(), z.coerce.number().min(0).max(100).optional()).optional(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function SiteSettingsPage() {
  const { toast } = useToast();
  const supabase = createClient();
  const [loading, setLoading] = React.useState(true);
  const [logoPreview, setLogoPreview] = React.useState('');
  const [faviconPreview, setFaviconPreview] = React.useState('');
  const [products, setProducts] = React.useState<any[]>([]);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      // Site Identity
      siteName: 'TecBunny',
      tagline: 'Your Tech Store',
      logoUrl: '',
      faviconUrl: '',
      
      // Color Scheme
      primaryColor: '#3b82f6',
      secondaryColor: '#64748b',
      accentColor: '#f59e0b',
      
      // Homepage Settings
      heroTitle: 'Future at Your Fingertips',
      heroSubtitle: 'Discover the latest in cutting-edge technology. From smart devices to essential gear, find everything you need to stay ahead.',
      heroButtonText: 'Shop All Products',
      heroButtonLink: '/products',
      featuredProductId: 'none',
      
      // Banner Settings
      topBannerEnabled: false,
      topBannerText: '',
      topBannerLink: '',
      topBannerImage: '',
      sideBannerEnabled: false,
      sideBannerImage: '',
      sideBannerLink: '',
      
      // Business Details
      companyName: 'TecBunny Solutions',
      address: '123 Tech Lane',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560100',
      country: 'India',
      
      // Contact Information
      phone: '(+91) 987 654 3210',
      email: 'support@tecbunny.com',
      website: 'https://tecbunny.com',
      
      // Business Registration
      gstin: '',
      pan: '',
      cin: '',
      businessType: 'Private Limited',
      
      // Additional Settings
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      enableGST: false,
      
      // Category-based GST Rates
      categoryGstRates: {
        'Electronics': 18,
        'Accessories': 18,
        'Books': 5,
        'Clothing': 12,
        'Food': 5,
        'Health': 12,
        'Home': 18,
        'Sports': 18,
      },
    },
  });

  // Load data on component mount
  React.useEffect(() => {
    const loadData = async () => {
      try {
        logger.info('Loading settings and products...');
        
        // Load settings
        const { data: settings, error: settingsError } = await supabase
          .from('settings')
          .select('*');
        
        // Load products
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('id, name, price, image');
        
        if (settingsError) {
          logger.error('Settings error:', { error: settingsError });
        } else if (settings && settings.length > 0) {
          const settingsMap = new Map(settings.map(s => [s.key, s.value]));
          
          const formData = {
            // Site Identity
            siteName: settingsMap.get('siteName') || 'TecBunny',
            tagline: settingsMap.get('tagline') || 'Your Tech Store',
            logoUrl: settingsMap.get('logoUrl') || '',
            faviconUrl: settingsMap.get('faviconUrl') || '',
            
            // Color Scheme
            primaryColor: settingsMap.get('primaryColor') || '#3b82f6',
            secondaryColor: settingsMap.get('secondaryColor') || '#64748b',
            accentColor: settingsMap.get('accentColor') || '#f59e0b',
            
            // Homepage Settings
            heroTitle: settingsMap.get('heroTitle') || 'Future at Your Fingertips',
            heroSubtitle: settingsMap.get('heroSubtitle') || 'Discover the latest in cutting-edge technology. From smart devices to essential gear, find everything you need to stay ahead.',
            heroButtonText: settingsMap.get('heroButtonText') || 'Shop All Products',
            heroButtonLink: settingsMap.get('heroButtonLink') || '/products',
            featuredProductId: settingsMap.get('featuredProductId') || 'none',
            
            // Banner Settings
            topBannerEnabled: settingsMap.get('topBannerEnabled') === 'true',
            topBannerText: settingsMap.get('topBannerText') || '',
            topBannerLink: settingsMap.get('topBannerLink') || '',
            topBannerImage: settingsMap.get('topBannerImage') || '',
            sideBannerEnabled: settingsMap.get('sideBannerEnabled') === 'true',
            sideBannerImage: settingsMap.get('sideBannerImage') || '',
            sideBannerLink: settingsMap.get('sideBannerLink') || '',
            
            // Business Details
            companyName: settingsMap.get('companyName') || 'TecBunny Solutions',
            address: settingsMap.get('address') || '123 Tech Lane',
            city: settingsMap.get('city') || 'Bangalore',
            state: settingsMap.get('state') || 'Karnataka',
            pincode: settingsMap.get('pincode') || '560100',
            country: settingsMap.get('country') || 'India',
            
            // Contact Information
            phone: settingsMap.get('phone') || '(+91) 987 654 3210',
            email: settingsMap.get('email') || 'support@tecbunny.com',
            website: settingsMap.get('website') || 'https://tecbunny.com',
            
            // Business Registration
            gstin: settingsMap.get('gstin') || '',
            pan: settingsMap.get('pan') || '',
            cin: settingsMap.get('cin') || '',
            businessType: settingsMap.get('businessType') || 'Private Limited',
            
            // Additional Settings
            currency: settingsMap.get('currency') || 'INR',
            timezone: settingsMap.get('timezone') || 'Asia/Kolkata',
            enableGST: settingsMap.get('enableGST') === 'true',
            
            // Category-based GST Rates
            categoryGstRates: settingsMap.get('categoryGstRates') 
              ? JSON.parse(settingsMap.get('categoryGstRates') || '{}')
              : {
                  'Electronics': 18,
                  'Accessories': 18,
                  'Books': 5,
                  'Clothing': 12,
                  'Food': 5,
                  'Health': 12,
                  'Home': 18,
                  'Sports': 18,
                },
          };
          
          form.reset(formData);
          setLogoPreview(formData.logoUrl);
          setFaviconPreview(formData.faviconUrl);
        }
        
        if (productsError) {
          logger.error('Products error:', { error: productsError });
        } else {
          setProducts(productsData || []);
        }
        
      } catch (error) {
        logger.error('Error loading data:', { error });
        toast({
          variant: 'destructive',
          title: 'Error loading settings',
          description: 'Failed to load settings. Please try refreshing the page.',
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [form, supabase, toast]);

  const onSubmit = async (data: SettingsFormValues) => {
    try {
      logger.info('Submitting settings:', { data });
      
      const { categoryGstRates, ...otherData } = data;
      
      // Convert "none" back to empty string for featuredProductId
      const processedData = { ...otherData };
      if (processedData.featuredProductId === 'none') {
        processedData.featuredProductId = '';
      }
      
      const settingsToUpsert = Object.entries(processedData).map(([key, value]) => ({
        key,
        value: typeof value === 'boolean' ? value.toString() : (value || '').toString(),
      }));
      
      // Add categoryGstRates as a JSON string
      if (categoryGstRates) {
        settingsToUpsert.push({
          key: 'categoryGstRates',
          value: JSON.stringify(categoryGstRates),
        });
      }
      
      const { error } = await supabase
        .from('settings')
        .upsert(settingsToUpsert, {
          onConflict: 'key',
        });
      
      if (error) {
        logger.error('Upsert error:', { error });
        toast({
          variant: 'destructive',
          title: 'Failed to save settings',
          description: `Could not save settings: ${error.message}`,
        });
      } else {
        toast({
          title: 'Settings saved successfully',
          description: 'Your site settings have been updated.',
        });
      }
      
    } catch (error) {
      logger.error('Exception during settings save:', { error });
      toast({
        variant: 'destructive',
        title: 'Failed to save settings',
        description: 'An unexpected error occurred while saving settings.',
      });
    }
  };

  const handleFileUpload = async (file: File, type: 'logo' | 'favicon') => {
    try {
      logger.info('Starting file upload:', { fileName: file.name, fileType: file.type, fileSize: file.size, uploadType: type });
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select a valid image file');
      }

      // Validate file size (max 4MB)
      if (file.size > 4 * 1024 * 1024) {
        throw new Error('File size must be less than 4MB');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      
      logger.info('Sending upload request to /api/upload');
      
      // Use the server-side API route for upload
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      logger.info('Upload response status:', { status: response.status, statusText: response.statusText });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        logger.error('Upload response error:', { error: errorData });
        throw new Error(errorData.error || `Upload failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      logger.info('Upload response data:', { data });
      
      if (!data.secure_url && !data.url) {
        logger.error('No URL in response:', { data });
        throw new Error('Invalid response from upload service');
      }
      
      const imageUrl = data.secure_url || data.url;
      logger.info('Using image URL:', { imageUrl });
      
      if (type === 'logo') {
        logger.info('Setting logo preview and form value');
        setLogoPreview(imageUrl);
        form.setValue('logoUrl', imageUrl);
      } else {
        logger.info('Setting favicon preview and form value');
        setFaviconPreview(imageUrl);
        form.setValue('faviconUrl', imageUrl);
      }
      
      toast({
        title: `${type.charAt(0).toUpperCase() + type.slice(1)} uploaded successfully`,
        description: `Your ${type} has been uploaded to cloud storage. Save settings to apply changes.`,
      });
      
    } catch (error) {
      logger.error('Error in handleFileUpload:', { error });
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: `Failed to upload ${type}. ${errorMessage}`,
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg font-medium">Loading settings...</p>
            <p className="text-sm text-muted-foreground mb-4">Please wait while we fetch your settings</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Site Settings</h1>
        <p className="text-muted-foreground">
          Manage your site configuration, branding, and business details.
        </p>
      </div>

      <Tabs defaultValue="identity" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="identity" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Identity
          </TabsTrigger>
          <TabsTrigger value="homepage" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Homepage
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="business" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Business
          </TabsTrigger>
          <TabsTrigger value="social" className="flex items-center gap-2">
            <Share2 className="h-4 w-4" />
            Social Media
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Advanced
          </TabsTrigger>
        </TabsList>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Site Identity Tab */}
            <TabsContent value="identity" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Site Identity</CardTitle>
                  <CardDescription>
                    Configure your site name, tagline, and branding assets.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="siteName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Site Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your Site Name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="tagline"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tagline</FormLabel>
                          <FormControl>
                            <Input placeholder="Your Site Tagline" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="logo">Logo</Label>
                      <div className="flex items-center gap-4">
                        <Input
                          id="logo"
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleFileUpload(file, 'logo');
                            }
                          }}
                        />
                        {logoPreview && (
                          <div className="w-16 h-16 rounded border">
                            <img 
                              src={logoPreview} 
                              alt="Logo preview" 
                              className="w-full h-full object-contain"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="favicon">Favicon</Label>
                      <div className="flex items-center gap-4">
                        <Input
                          id="favicon"
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleFileUpload(file, 'favicon');
                            }
                          }}
                        />
                        {faviconPreview && (
                          <div className="w-8 h-8 rounded border">
                            <img 
                              src={faviconPreview} 
                              alt="Favicon preview" 
                              className="w-full h-full object-contain"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Homepage Tab */}
            <TabsContent value="homepage" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Homepage Settings</CardTitle>
                  <CardDescription>
                    Configure your homepage hero section and featured content.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    <FormField
                      control={form.control}
                      name="heroTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hero Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Your main headline" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="heroSubtitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hero Subtitle</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Your hero description" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="heroButtonText"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Button Text</FormLabel>
                            <FormControl>
                              <Input placeholder="Button text" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="heroButtonLink"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Button Link</FormLabel>
                            <FormControl>
                              <Input placeholder="/products" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="featuredProductId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Featured Product</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a product to feature" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">No featured product</SelectItem>
                              {products.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name} - ₹{product.price}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Banner Settings</CardTitle>
                  <CardDescription>
                    Configure promotional banners for your homepage.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="topBannerEnabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Top Banner</FormLabel>
                            <FormDescription>
                              Show a banner at the top of your homepage
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    {form.watch('topBannerEnabled') && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="topBannerText"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Banner Text</FormLabel>
                              <FormControl>
                                <Input placeholder="Banner text" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="topBannerLink"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Banner Link</FormLabel>
                              <FormControl>
                                <Input placeholder="/offers" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Appearance Tab */}
            <TabsContent value="appearance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Color Scheme</CardTitle>
                  <CardDescription>
                    Customize your site's color palette.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField
                      control={form.control}
                      name="primaryColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary Color</FormLabel>
                          <FormControl>
                            <Input type="color" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="secondaryColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Secondary Color</FormLabel>
                          <FormControl>
                            <Input type="color" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="accentColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Accent Color</FormLabel>
                          <FormControl>
                            <Input type="color" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Business Tab */}
            <TabsContent value="business" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Business Details</CardTitle>
                  <CardDescription>
                    Configure your business information and contact details.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your Company Name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="businessType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select business type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Sole Proprietorship">Sole Proprietorship</SelectItem>
                              <SelectItem value="Partnership">Partnership</SelectItem>
                              <SelectItem value="Private Limited">Private Limited</SelectItem>
                              <SelectItem value="Public Limited">Public Limited</SelectItem>
                              <SelectItem value="LLP">LLP</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="Phone number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Email address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <Input placeholder="Website URL" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Social Media Tab */}
            <TabsContent value="social" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Share2 className="h-5 w-5" />
                    Social Media Links
                  </CardTitle>
                  <CardDescription>
                    Manage your business social media presence and links that appear across your website.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Share2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Advanced Social Media Management</h3>
                    <p className="text-muted-foreground mb-6">
                      For comprehensive social media management with preview, validation, and advanced features, 
                      visit the dedicated Social Media Management page.
                    </p>
                    <div className="flex gap-3 justify-center">
                      <Button
                        type="button"
                        onClick={() => window.open('/management/admin/social-media', '_blank')}
                        className="flex items-center gap-2"
                      >
                        <Share2 className="h-4 w-4" />
                        Open Social Media Manager
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => window.location.href = '/management/admin/social-media'}
                      >
                        Go to Social Media Page
                      </Button>
                    </div>
                  </div>
                  
                  {/* Quick Links Section */}
                  <div className="border-t pt-6 mt-6">
                    <h4 className="text-md font-medium mb-4">Quick Social Media Setup</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="quick-facebook">Facebook URL</Label>
                          <Input
                            id="quick-facebook"
                            placeholder="https://facebook.com/yourpage"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="quick-instagram">Instagram URL</Label>
                          <Input
                            id="quick-instagram"
                            placeholder="https://instagram.com/yourusername"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="quick-twitter">Twitter URL</Label>
                          <Input
                            id="quick-twitter"
                            placeholder="https://twitter.com/yourusername"
                            className="mt-1"
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="quick-linkedin">LinkedIn URL</Label>
                          <Input
                            id="quick-linkedin"
                            placeholder="https://linkedin.com/company/yourcompany"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="quick-youtube">YouTube URL</Label>
                          <Input
                            id="quick-youtube"
                            placeholder="https://youtube.com/c/yourchannel"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="quick-website">Website URL</Label>
                          <Input
                            id="quick-website"
                            placeholder="https://yourwebsite.com"
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-start gap-3">
                        <Share2 className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <h5 className="font-medium text-blue-900">Pro Tip</h5>
                          <p className="text-sm text-blue-700 mt-1">
                            Use the dedicated Social Media Manager for advanced features like link validation, 
                            preview functionality, bulk editing, and real-time testing of your social media links.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Advanced Settings</CardTitle>
                  <CardDescription>
                    Configure advanced site settings and integrations.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Currency</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select currency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="INR">Indian Rupee (₹)</SelectItem>
                              <SelectItem value="USD">US Dollar ($)</SelectItem>
                              <SelectItem value="EUR">Euro (€)</SelectItem>
                              <SelectItem value="GBP">British Pound (£)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="timezone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Timezone</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select timezone" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Asia/Kolkata">Asia/Kolkata</SelectItem>
                              <SelectItem value="America/New_York">America/New_York</SelectItem>
                              <SelectItem value="Europe/London">Europe/London</SelectItem>
                              <SelectItem value="Asia/Tokyo">Asia/Tokyo</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="enableGST"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Enable GST</FormLabel>
                          <FormDescription>
                            Enable GST calculation for products
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <div className="flex justify-end">
              <Button type="submit" size="lg">
                Save Settings
              </Button>
            </div>
          </form>
        </Form>
      </Tabs>
    </div>
  );
}