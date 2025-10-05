'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';

import { 
  Plus, 
  Edit2, 
  Save, 
  RefreshCw, 
  Upload,
  Download,
  Trash2,
  Package,
  ShoppingCart,
  Tag,
  Image,
  Eye,
  X
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import { Textarea } from '../../../../components/ui/textarea';
import { Badge } from '../../../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../../components/ui/table';
import { useToast } from '../../../../hooks/use-toast';
import CSVImportDialog from '../../../../components/admin/csv-import-dialog';

interface Product {
  id: string;
  handle: string;
  title: string;
  description?: string;
  vendor?: string;
  product_type?: string;
  tags?: string[];
  status: 'active' | 'archived' | 'draft';
  images?: any[];
  created_at: string;
  updated_at: string;
  variants?: ProductVariant[];
  options?: ProductOption[];
}

interface ProductVariant {
  id: string;
  title?: string;
  sku?: string;
  price: number;
  inventory_quantity: number;
  option1?: string;
  option2?: string;
  option3?: string;
  status: string;
}

interface ProductOption {
  id: string;
  name: string;
  values: string[];
  position: number;
}

interface ProductFormData {
  handle: string;
  title: string;
  description: string;
  vendor: string;
  product_type: string;
  tags: string;
  status: 'active' | 'archived' | 'draft';
  images?: { url: string; alt?: string }[];
  options: { name: string; values: string[] }[];
  variants: {
    title: string;
    sku: string;
    price: number;
    inventory_quantity: number;
    option1: string;
    option2: string;
    option3: string;
  }[];
}

import { logger } from '../../../../lib/logger';

export default function AdminProductCatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [formData, setFormData] = useState<ProductFormData>({
    handle: '',
    title: '',
    description: '',
    vendor: '',
    product_type: '',
    tags: '',
    status: 'active',
  images: [],
    options: [{ name: 'Color', values: [] }],
    variants: []
  });

  const { toast } = useToast();

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/products?include_variants=true&include_options=true&page=${page}&limit=${limit}`);
      const result = await response.json();
      
      logger.debug('Fetch products response:', { result });
      
      if (result.success) {
        setProducts(result.data || []);
        if (result.pagination) {
          setTotalPages(result.pagination.pages || 1);
          setTotalItems(result.pagination.total || result.data?.length || 0);
        }
      } else {
        logger.error('API returned error:', { error: result.error });
        toast({
          title: "Error",
          description: result.error || "Failed to fetch products",
          variant: "destructive"
        });
        setProducts([]); // Clear products on error
      }
    } catch (error) {
      logger.error('Error fetching products:', { error });
      toast({
        title: "Error",
        description: "Failed to fetch products",
        variant: "destructive"
      });
      setProducts([]); // Clear products on error
    } finally {
      setLoading(false);
    }
  }, [page, limit, toast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSaveProduct = async () => {
    try {
      setIsSaving(true);
      // Normalize images to array of plain URL strings – backend expects text[] or json[] of URLs
      const productData = {
        handle: formData.handle,
        title: formData.title,
        description: formData.description,
        vendor: formData.vendor,
        product_type: formData.product_type,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        status: formData.status,
        images: (formData.images || []).map(img => typeof (img as any) === 'string' ? img : img.url).filter(Boolean),
        options: formData.options.filter(opt => opt.name && opt.values.length > 0),
        variants: formData.variants.filter(variant => variant.title && variant.price > 0)
      } as const;

      const isEdit = editMode && selectedProduct?.id;
  const url = '/api/products?debug=1';
      const method = isEdit ? 'PUT' : 'POST';
      const body = isEdit ? JSON.stringify({ id: selectedProduct!.id, ...productData }) : JSON.stringify(productData);

      const correlationId = (crypto?.randomUUID && crypto.randomUUID()) || Math.random().toString(36).slice(2);
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-correlation-id': correlationId },
        body
      });

      if (response.ok) {
        const json = await response.json();
        toast({
          title: "Success",
          description: (isEdit ? "Product updated" : "Product saved") + (json.warnings?.length ? ` (with warnings: ${json.warnings.join('; ')})` : '!'),
        });
        setShowAddForm(false);
        setEditMode(false);
  setSelectedProduct(null);
  resetForm();
      } else {
        let errorJson: any = {};
        try { errorJson = await response.json(); } catch { /* ignore */ }
        logger.error('Product save failed', { status: response.status, errorJson });
        const detailParts = [errorJson.error || 'Unknown error'];
        if (errorJson.error_code) detailParts.push(`code:${errorJson.error_code}`);
        if (errorJson.hint) detailParts.push(`hint:${errorJson.hint}`);
        if (errorJson.correlationId) detailParts.push(`cid:${errorJson.correlationId}`);
        toast({
          title: 'Error',
          description: detailParts.join(' | '),
          variant: 'destructive'
        });
      }
    } catch (error) {
      logger.error('Error saving product:', { error });
      toast({
        title: "Error",
        description: "Error saving product",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      handle: '',
      title: '',
      description: '',
      vendor: '',
      product_type: '',
      tags: '',
      status: 'active',
  images: [],
      options: [{ name: 'Color', values: [] }],
      variants: []
    });
  };

  const startAddNew = () => {
    setEditMode(false);
    setSelectedProduct(null);
    resetForm();
    setShowAddForm(true);
  };

  const handleEdit = async (product: Product) => {
    try {
      setEditMode(true);
      setSelectedProduct(product);
      setShowAddForm(true);
      // Fetch full product details with options and variants
      const resp = await fetch(`/api/products?handle=${encodeURIComponent(product.handle)}&include_variants=true&include_options=true`);
      const result = await resp.json();
      const p = result?.data || product;
      setFormData({
        handle: p.handle || '',
        title: p.title || '',
        description: p.description || '',
        vendor: p.vendor || '',
        product_type: p.product_type || '',
        tags: Array.isArray(p.tags) ? p.tags.join(', ') : (typeof p.tags === 'string' ? p.tags : ''),
        status: (p.status as any) || 'active',
  images: (p.images || []).map((img: any) => ({ url: img.url || img, alt: img.alt })),
        options: (p.options || []).map((o: any) => ({ name: o.name, values: o.values || [] })),
        variants: (p.variants || []).map((v: any) => ({
          title: v.title || '',
          sku: v.sku || '',
          price: typeof v.price === 'number' ? v.price : 0,
          inventory_quantity: typeof v.inventory_quantity === 'number' ? v.inventory_quantity : 0,
          option1: v.option1 || '',
          option2: v.option2 || '',
          option3: v.option3 || '',
        }))
      });
    } catch {
      toast({ title: 'Error', description: 'Failed to load product for editing', variant: 'destructive' });
    }
  };

  // Image upload handlers
  const uploadInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const handleImagePick = () => uploadInputRef.current?.click();
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/uploads/product', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok || !data?.url) throw new Error(data?.error || 'Upload failed');
      setFormData(prev => ({ ...prev, images: [...(prev.images || []), { url: data.url }] }));
      toast({ title: 'Image uploaded', description: 'Product image added.' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err?.message || 'Could not upload image', variant: 'destructive' });
    } finally {
      setIsUploadingImage(false);
      if (e.target) e.target.value = '';
    }
  };
  const removeImage = (url: string) => {
    setFormData(prev => ({ ...prev, images: (prev.images || []).filter(img => img.url !== url) }));
  };
  // Basic reorder helpers
  const moveImage = (idx: number, dir: -1 | 1) => {
    setFormData(prev => {
      const imgs = [...(prev.images || [])];
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= imgs.length) return prev;
      const [item] = imgs.splice(idx, 1);
      imgs.splice(newIdx, 0, item);
      return { ...prev, images: imgs };
    });
  };
  // Drag-and-drop area
  const onDropImages = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/'));
    if (!files.length) return;
    setIsUploadingImage(true);
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/uploads/product', { method: 'POST', body: fd });
        const data = await res.json();
        if (res.ok && data?.url) {
          setFormData(prev => ({ ...prev, images: [...(prev.images || []), { url: data.url }] }));
        }
      }
      toast({ title: 'Images uploaded', description: `${files.length} image(s) added.` });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err?.message || 'Could not upload images', variant: 'destructive' });
    } finally {
      setIsUploadingImage(false);
    }
  };
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();

  const addOption = () => {
    setFormData({
      ...formData,
      options: [...formData.options, { name: '', values: [] }]
    });
  };

  const updateOption = (index: number, field: 'name' | 'values', value: string | string[]) => {
    const newOptions = [...formData.options];
    if (field === 'values' && typeof value === 'string') {
      newOptions[index].values = value.split(',').map(v => v.trim()).filter(Boolean);
    } else {
      newOptions[index][field] = value as any;
    }
    setFormData({ ...formData, options: newOptions });
  };

  const removeOption = (index: number) => {
    setFormData({
      ...formData,
      options: formData.options.filter((_, i) => i !== index)
    });
  };

  const generateVariants = () => {
    const option1Values = formData.options[0]?.values || [];
    const option2Values = formData.options[1]?.values || [];
    const option3Values = formData.options[2]?.values || [];

    const variants: any[] = [];

    if (option1Values.length > 0) {
      option1Values.forEach(value1 => {
        if (option2Values.length > 0) {
          option2Values.forEach(value2 => {
            if (option3Values.length > 0) {
              option3Values.forEach(value3 => {
                variants.push({
                  title: `${formData.title} - ${value1} / ${value2} / ${value3}`,
                  sku: `${formData.handle.toUpperCase()}-${value1.substring(0, 3).toUpperCase()}-${value2.substring(0, 3).toUpperCase()}-${value3.substring(0, 3).toUpperCase()}`,
                  price: 0,
                  inventory_quantity: 0,
                  option1: value1,
                  option2: value2,
                  option3: value3
                });
              });
            } else {
              variants.push({
                title: `${formData.title} - ${value1} / ${value2}`,
                sku: `${formData.handle.toUpperCase()}-${value1.substring(0, 3).toUpperCase()}-${value2.substring(0, 3).toUpperCase()}`,
                price: 0,
                inventory_quantity: 0,
                option1: value1,
                option2: value2,
                option3: ''
              });
            }
          });
        } else {
          variants.push({
            title: `${formData.title} - ${value1}`,
            sku: `${formData.handle.toUpperCase()}-${value1.substring(0, 3).toUpperCase()}`,
            price: 0,
            inventory_quantity: 0,
            option1: value1,
            option2: '',
            option3: ''
          });
        }
      });
    }

    setFormData({ ...formData, variants });
  };

  const updateVariant = (index: number, field: string, value: any) => {
    const newVariants = [...formData.variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setFormData({ ...formData, variants: newVariants });
  };

  const handleExport = async (templateOnly = false) => {
    try {
      const url = templateOnly ? '/api/products/bulk-edit?template=true' : '/api/products/bulk-edit';
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = templateOnly ? 'product_template.csv' : `products_bulk_edit_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      // Safe cleanup
      try { (a as any)?.remove?.(); } catch {}
      try { window.URL.revokeObjectURL(downloadUrl); } catch {}
      
      toast({
        title: "Success",
        description: templateOnly ? "Template downloaded successfully" : "Products exported successfully",
      });
    } catch (error) {
      logger.error('Export error:', { error });
      toast({
        title: "Error",
        description: "Export failed",
        variant: "destructive"
      });
    }
  };

  // Delete product logic
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const handleDelete = async (product: Product) => {
    if (!product?.id) return;
    const proceed = window.confirm(`Delete product "${product.title}"? This cannot be undone.`);
    if (!proceed) return;
    setDeletingIds(prev => new Set(prev).add(product.id));
    try {
      const correlationId = (crypto?.randomUUID && crypto.randomUUID()) || Math.random().toString(36).slice(2);
      const res = await fetch(`/api/products?id=${encodeURIComponent(product.id)}`, { method: 'DELETE', headers: { 'x-correlation-id': correlationId } });
      if (res.ok) {
        toast({ title: 'Deleted', description: 'Product removed.' });
        // If we were editing this product, reset form state
        if (selectedProduct?.id === product.id) {
          setEditMode(false);
          setSelectedProduct(null);
          setShowAddForm(false);
        }
        fetchProducts();
      } else {
        let j: any = {}; try { j = await res.json(); } catch {}
        toast({ title: 'Delete failed', description: j.error || 'Unknown error', variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to delete product', variant: 'destructive' });
    } finally {
      setDeletingIds(prev => { const n = new Set(prev); n.delete(product.id); return n; });
    }
  };

  const downloadTemplate = async () => {
    await handleExport(true);
  };

  const handleExportClick = async () => {
    await handleExport(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Product Management</h1>
            <p className="text-gray-600">Manage your product catalog with variants</p>
          </div>
          <div className="flex space-x-3">
            <Button 
              variant="outline" 
              onClick={downloadTemplate}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Download Template</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={handleExportClick}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowImportDialog(true)}
              className="flex items-center space-x-2"
            >
              <Upload className="h-4 w-4" />
              <span>Import CSV</span>
            </Button>
            <Button 
              onClick={startAddNew}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Product</span>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Package className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Products</p>
                  <p className="text-2xl font-bold text-gray-900">{products.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <ShoppingCart className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Products</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {products.filter(p => p.status === 'active').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Tag className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Variants</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {products.reduce((acc, p) => acc + (p.variants?.length || 0), 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Image className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Draft Products</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {products.filter(p => p.status === 'draft').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        {showAddForm ? (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{editMode ? 'Edit Product' : 'Add New Product'}</CardTitle>
                  <CardDescription>{editMode ? 'Update product details and variants' : 'Create a new product with variants and options'}</CardDescription>
                </div>
                <Button variant="outline" onClick={() => { setShowAddForm(false); setEditMode(false); setSelectedProduct(null); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="options">Options</TabsTrigger>
                  <TabsTrigger value="variants">Variants</TabsTrigger>
                  <TabsTrigger value="images">Images</TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="handle">Handle *</Label>
                      <Input
                        id="handle"
                        value={formData.handle}
                        onChange={(e) => setFormData({...formData, handle: e.target.value})}
                        placeholder="e.g., del123"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        placeholder="e.g., Mouse M16"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vendor">Vendor</Label>
                      <Input
                        id="vendor"
                        value={formData.vendor}
                        onChange={(e) => setFormData({...formData, vendor: e.target.value})}
                        placeholder="e.g., TechBrand"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="product_type">Product Type</Label>
                      <Input
                        id="product_type"
                        value={formData.product_type}
                        onChange={(e) => setFormData({...formData, product_type: e.target.value})}
                        placeholder="e.g., Electronics"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tags">Tags (comma separated)</Label>
                      <Input
                        id="tags"
                        value={formData.tags}
                        onChange={(e) => setFormData({...formData, tags: e.target.value})}
                        placeholder="e.g., mouse, gaming, wireless"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <select
                        id="status"
                        value={formData.status}
                        onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                        className="w-full p-2 border rounded-md"
                      >
                        <option value="active">Active</option>
                        <option value="draft">Draft</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Product description..."
                      rows={4}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="options" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Product Options</h3>
                    <Button onClick={addOption} variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Option
                    </Button>
                  </div>
                  
                  {formData.options.map((option, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start space-x-4">
                          <div className="flex-1 space-y-2">
                            <Label>Option Name</Label>
                            <Input
                              value={option.name}
                              onChange={(e) => updateOption(index, 'name', e.target.value)}
                              placeholder="e.g., Color, Size"
                            />
                          </div>
                          <div className="flex-1 space-y-2">
                            <Label>Values (comma separated)</Label>
                            <Input
                              value={option.values.join(', ')}
                              onChange={(e) => updateOption(index, 'values', e.target.value)}
                              placeholder="e.g., Black, White, Blue"
                            />
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => removeOption(index)}
                            className="mt-6"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {formData.options.length > 0 && (
                    <Button onClick={generateVariants} className="w-full">
                      Generate Variants from Options
                    </Button>
                  )}
                </TabsContent>

                <TabsContent value="variants" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Product Variants</h3>
                    <Badge variant="secondary">{formData.variants.length} variants</Badge>
                  </div>
                  
                  {formData.variants.length > 0 ? (
                    <div className="space-y-3">
                      {formData.variants.map((variant, index) => (
                        <Card key={index}>
                          <CardContent className="p-4">
                            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                              <div className="space-y-2">
                                <Label>Title</Label>
                                <Input
                                  value={variant.title}
                                  onChange={(e) => updateVariant(index, 'title', e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>SKU</Label>
                                <Input
                                  value={variant.sku}
                                  onChange={(e) => updateVariant(index, 'sku', e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Price</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={variant.price}
                                  onChange={(e) => updateVariant(index, 'price', parseFloat(e.target.value) || 0)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Inventory</Label>
                                <Input
                                  type="number"
                                  value={variant.inventory_quantity}
                                  onChange={(e) => updateVariant(index, 'inventory_quantity', parseInt(e.target.value) || 0)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Options</Label>
                                <div className="text-sm text-gray-600">
                                  {[variant.option1, variant.option2, variant.option3].filter(Boolean).join(' / ')}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No variants created yet. Add options first, then generate variants.
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="images" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Product Images</h3>
                    <div className="flex items-center gap-3">
                      <input ref={uploadInputRef} onChange={handleImageChange} type="file" accept="image/*" className="hidden" />
                      <Button onClick={handleImagePick} disabled={isUploadingImage}>
                        <Upload className="h-4 w-4 mr-2" />
                        {isUploadingImage ? 'Uploading...' : 'Add Image'}
                      </Button>
                    </div>
                  </div>
                  <div onDrop={onDropImages} onDragOver={onDragOver} className="border border-dashed rounded-md p-4 text-sm text-gray-500">
                    Drag & drop images here to upload
                  </div>
                  {formData.images && formData.images.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {formData.images.map((img, idx) => (
                        <div key={idx} className="relative border rounded overflow-hidden group">
                          { }
                          <img src={img.url} alt={img.alt || `Image ${idx + 1}`} className="w-full h-32 object-cover" />
                          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100">
                            <button type="button" onClick={() => moveImage(idx, -1)} className="bg-black/60 text-white text-xs px-2 py-1 rounded">Up</button>
                            <button type="button" onClick={() => moveImage(idx, 1)} className="bg-black/60 text-white text-xs px-2 py-1 rounded">Down</button>
                            <button type="button" onClick={() => removeImage(img.url)} className="bg-red-600/80 text-white text-xs px-2 py-1 rounded">Remove</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">No images yet. Upload product images to showcase the item.</div>
                  )}
                </TabsContent>
              </Tabs>
              
              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
                <Button variant="outline" onClick={() => { setShowAddForm(false); setEditMode(false); setSelectedProduct(null); }}>
                  Cancel
                </Button>
                <Button onClick={handleSaveProduct} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  {editMode ? 'Update Product' : 'Save Product'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Product Catalog</CardTitle>
              <CardDescription>Manage all your products and variants</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Handle</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Variants</TableHead>
                      <TableHead>Options</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-mono text-sm">{product.handle}</TableCell>
                        <TableCell className="font-medium">{product.title}</TableCell>
                        <TableCell>{product.vendor}</TableCell>
                        <TableCell>{product.product_type}</TableCell>
                        <TableCell>
                          <Badge variant={
                            product.status === 'active' ? 'default' :
                            product.status === 'draft' ? 'secondary' : 'outline'
                          }>
                            {product.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {product.variants?.length || 0} variants
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {product.options?.map((option, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {option.name}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleEdit(product)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="destructive" disabled={deletingIds.has(product.id)} onClick={() => handleDelete(product)}>
                              {deletingIds.has(product.id) ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {/* Pagination controls */}
              {!showAddForm && (
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-6">
                  <div className="text-sm text-gray-600">
                    Page {page} of {totalPages} • {totalItems} items
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 hidden md:block">Rows:</label>
                    <select
                      className="border rounded px-2 py-1 text-sm"
                      value={limit}
                      onChange={(e) => { setPage(1); setLimit(parseInt(e.target.value) || 20); }}
                    >
                      {[10,20,50,100].map(sz => (<option key={sz} value={sz}>{sz}</option>))}
                    </select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page <= 1 || loading}
                    >
                      Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages || loading}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* CSV Import Dialog */}
      <CSVImportDialog 
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onSuccess={() => {
          fetchProducts();
          setShowImportDialog(false);
        }}
      />
    </div>
  );
}