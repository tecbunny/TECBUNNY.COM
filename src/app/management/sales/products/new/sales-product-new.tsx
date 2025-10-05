
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { ArrowLeft } from 'lucide-react';

import { Button } from '../../../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../../components/ui/card';
import { Input } from '../../../../../components/ui/input';
import { Textarea } from '../../../../../components/ui/textarea';
import { Switch } from '../../../../../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../../components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '../../../../../components/ui/form';
import { Label } from '../../../../../components/ui/label';
import { useToast } from '../../../../../hooks/use-toast';
import { createClient } from '../../../../../lib/supabase/client';

const productSchema = z.object({
  name: z.string().min(3, { message: "Product name must be at least 3 characters." }),
  brand: z.string().min(2, { message: "Brand is required." }),
  category: z.string().min(2, { message: "Category is required." }),
  description: z.string().min(10, { message: "Description is required." }),
  mrp: z.coerce.number().positive({ message: "MRP must be a positive number." }),
  price: z.coerce.number().positive({ message: "Sale price must be a positive number." }),
  hsnCode: z.string().optional(),
  gstRate: z.string().optional(),
  warranty: z.string().optional(),
  isSerialNumberCompulsory: z.boolean().default(false),
  product_url: z.string().url({ message: "Please enter a valid URL" }).optional().or(z.literal("")),
  model_number: z.string().optional(),
  barcode: z.string().optional(),
  specifications: z.string().optional(), // Will be converted to object
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function NewProductPage() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  const [imagePreview, setImagePreview] = React.useState<string>('');
  const [additionalImages, setAdditionalImages] = React.useState<string[]>([]);
  const [uploading, setUploading] = React.useState(false);
  
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      brand: '',
      category: '',
      description: '',
      price: 0,
      mrp: 0,
      hsnCode: '',
      gstRate: '',
      warranty: '',
      isSerialNumberCompulsory: false,
      product_url: '',
      model_number: '',
      barcode: '',
      specifications: '',
    },
  });

  const handleImageUpload = async (file: File, isAdditional = false) => {
    try {
      setUploading(true);
      
      // Show loading state
      toast({
        title: 'Uploading...',
        description: 'Uploading product image to cloud storage.',
      });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'product');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      // Update preview and form
      if (isAdditional) {
        setAdditionalImages(prev => [...prev, result.url]);
      } else {
        setImagePreview(result.url);
      }
      
      toast({
        title: 'Image uploaded successfully',
        description: 'Product image has been uploaded to cloud storage.',
      });

      return result.url;

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload image',
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: ProductFormValues) => {
    try {
        // Parse specifications if provided
        let specifications = {};
        if (data.specifications) {
          try {
            // Try to parse as JSON, or convert string format like "key:value,key2:value2"
            if (data.specifications.includes(':')) {
              const pairs = data.specifications.split(',');
              specifications = pairs.reduce((acc, pair) => {
                const [key, value] = pair.split(':').map(s => s.trim());
                if (key && value) acc[key] = value;
                return acc;
              }, {} as Record<string, string>);
            }
          } catch (e) {
            console.warn('Could not parse specifications:', e);
          }
        }

        const newProductData = {
            ...data,
            gstRate: data.gstRate ? parseFloat(data.gstRate) : undefined,
            image: imagePreview || '',
            additional_images: additionalImages,
            specifications: Object.keys(specifications).length > 0 ? specifications : undefined,
            popularity: 50,
            rating: 0,
            reviewCount: 0,
        };
        
        const { error } = await supabase.from('products').insert(newProductData);
        if (error) throw error;
        
        toast({
            title: "Product Created",
            description: `${data.name} has been added to the inventory.`,
        });
        router.push('/management/sales/products');
    } catch(e: any) {
        toast({
            variant: "destructive",
            title: "Failed to create product",
            description: e.message || "An unexpected error occurred.",
        });
    }
  };

  return (
    <div className="space-y-8">
      <div>
         <Button variant="outline" asChild>
            <Link href="/management/sales/products">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Products
            </Link>
          </Button>
      </div>
     
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                  <Card>
                      <CardHeader>
                          <CardTitle>Product Details</CardTitle>
                          <CardDescription>Add the main details for your new product.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                          <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem><FormLabel>Product Name</FormLabel><FormControl><Input placeholder="e.g., Aura Wireless Headphones" {...field} /></FormControl><FormMessage /></FormItem>
                          )}/>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField control={form.control} name="brand" render={({ field }) => (
                                <FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., TecBunny" {...field} /></FormControl><FormMessage /></FormItem>
                              )}/>
                              <FormField control={form.control} name="category" render={({ field }) => (
                                <FormItem><FormLabel>Category</FormLabel><FormControl><Input placeholder="e.g., Mobile Accessories" {...field} /></FormControl><FormMessage /></FormItem>
                              )}/>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField control={form.control} name="model_number" render={({ field }) => (
                                <FormItem><FormLabel>Model Number</FormLabel><FormControl><Input placeholder="e.g., TB-WH-001" {...field} /></FormControl><FormMessage /></FormItem>
                              )}/>
                              <FormField control={form.control} name="barcode" render={({ field }) => (
                                <FormItem><FormLabel>Barcode/SKU</FormLabel><FormControl><Input placeholder="e.g., 1234567890123" {...field} /></FormControl><FormMessage /></FormItem>
                              )}/>
                          </div>
                          <FormField control={form.control} name="product_url" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Product URL</FormLabel>
                              <FormControl><Input placeholder="https://example.com/product-page" {...field} /></FormControl>
                              <FormDescription>Optional: Direct link to product page, manufacturer website, or product details</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}/>
                          <FormField control={form.control} name="description" render={({ field }) => (
                            <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Describe the product..." rows={6} {...field} /></FormControl><FormMessage /></FormItem>
                          )}/>
                          <FormField control={form.control} name="specifications" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Specifications</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Enter specifications in format: Battery Life:24 hours, Connectivity:Bluetooth 5.0, Weight:250g" 
                                  rows={3} 
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>Format: Key:Value, Key2:Value2 (comma separated)</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}/>
                      </CardContent>
                  </Card>
                  <Card>
                      <CardHeader>
                          <CardTitle>Pricing & Taxation</CardTitle>
                          <CardDescription>Set the pricing and tax information for the product.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="mrp" render={({ field }) => (
                                <FormItem><FormLabel>MRP (₹)</FormLabel><FormControl><Input type="number" placeholder="e.g., 25000.00" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="price" render={({ field }) => (
                                <FormItem><FormLabel>Sale Price (₹)</FormLabel><FormControl><Input type="number" placeholder="e.g., 19999.00" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField control={form.control} name="hsnCode" render={({ field }) => (
                                <FormItem><FormLabel>HSN Code</FormLabel><FormControl><Input placeholder="e.g., 85183000" {...field} /></FormControl><FormMessage /></FormItem>
                              )}/>
                              <FormField control={form.control} name="gstRate" render={({ field }) => (
                                <FormItem><FormLabel>Custom GST Rate (%) - Optional</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}><FormControl>
                                <SelectTrigger><SelectValue placeholder="Auto from category or select custom" /></SelectTrigger></FormControl>
                                <SelectContent><SelectItem value="0">0%</SelectItem><SelectItem value="5">5%</SelectItem><SelectItem value="12">12%</SelectItem><SelectItem value="18">18%</SelectItem><SelectItem value="28">28%</SelectItem></SelectContent>
                                </Select>
                                <FormDescription>Leave empty to use category-based GST rate from settings</FormDescription>
                                <FormMessage /></FormItem>
                              )}/>
                          </div>
                      </CardContent>
                  </Card>
              </div>
              <div className="lg:col-span-1 space-y-8">
                  <Card>
                      <CardHeader><CardTitle>Additional Information</CardTitle></CardHeader>
                      <CardContent className="space-y-6">
                          <FormField control={form.control} name="warranty" render={({ field }) => (
                            <FormItem><FormLabel>Warranty</FormLabel><FormControl><Input placeholder="e.g., 1 Year Manufacturer Warranty" {...field} /></FormControl><FormMessage /></FormItem>
                          )}/>
                          <FormField control={form.control} name="isSerialNumberCompulsory" render={({ field }) => (
                            <FormItem className="flex items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5"><FormLabel>Serial Number Tracking</FormLabel>
                                <p className="text-xs text-muted-foreground">Is a serial number required for this product?</p>
                              </div>
                              <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </FormItem>
                          )}/>
                      </CardContent>
                  </Card>
                   <Card>
                      <CardHeader>
                          <CardTitle>Product Images</CardTitle>
                          <CardDescription>Upload main product image and additional images.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                          {/* Main Product Image */}
                          <div>
                            <Label className="text-sm font-medium">Main Product Image</Label>
                            {imagePreview && (
                              <div className="mb-4">
                                <img 
                                  src={imagePreview} 
                                  alt="Product preview" 
                                  className="w-full h-48 object-cover rounded-lg border"
                                />
                              </div>
                            )}
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  await handleImageUpload(file, false);
                                }
                              }}
                              className="mb-2"
                              disabled={uploading}
                            />
                            <p className="text-sm text-muted-foreground">
                              Upload main product image (JPG, PNG, WebP). Max size: 4MB
                            </p>
                          </div>

                          {/* Additional Images */}
                          <div>
                            <Label className="text-sm font-medium">Additional Images</Label>
                            {additionalImages.length > 0 && (
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                                {additionalImages.map((image, index) => (
                                  <div key={index} className="relative">
                                    <img 
                                      src={image} 
                                      alt={`Additional ${index + 1}`} 
                                      className="w-full h-32 object-cover rounded-lg border"
                                    />
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="sm"
                                      className="absolute top-1 right-1 h-6 w-6 p-0"
                                      onClick={() => {
                                        setAdditionalImages(prev => prev.filter((_, i) => i !== index));
                                      }}
                                    >
                                      ×
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                            <Input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={async (e) => {
                                const files = Array.from(e.target.files || []);
                                for (const file of files) {
                                  await handleImageUpload(file, true);
                                }
                              }}
                              className="mb-2"
                              disabled={uploading}
                            />
                            <p className="text-sm text-muted-foreground">
                              Upload additional product images (JPG, PNG, WebP). Max 5 images, 4MB each.
                            </p>
                          </div>
                      </CardContent>
                  </Card>
                  <Button type="submit" className="w-full" size="lg" disabled={form.formState.isSubmitting || uploading}>
                    {form.formState.isSubmitting ? 'Saving...' : uploading ? 'Uploading...' : 'Save Product'}
                  </Button>
              </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
