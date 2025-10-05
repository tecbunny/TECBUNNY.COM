'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';

import { 
  Plus, 
  Edit2, 
  Trash2, 
  Eye, 
  EyeOff, 
  Tag,
  TrendingUp,
  Gift,
  Users
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import { useToast } from '../../hooks/use-toast';
import { logger } from '../../lib/logger';

interface Offer {
  id: string;
  title: string;
  description?: string;
  discount_type: 'percentage' | 'fixed_amount' | 'buy_x_get_y' | 'free_shipping';
  discount_value?: number;
  minimum_purchase_amount?: number;
  maximum_discount_amount?: number;
  offer_code?: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_featured: boolean;
  usage_limit?: number;
  usage_count: number;
  usage_limit_per_customer?: number;
  customer_eligibility: 'all' | 'new_customers' | 'existing_customers' | 'vip_customers';
  priority: number;
  display_on_homepage: boolean;
  banner_text?: string;
  banner_color?: string;
  terms_and_conditions?: string;
  created_at: string;
}

export default function OffersManagement() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed_amount' | 'buy_x_get_y' | 'free_shipping',
    discount_value: '',
    minimum_purchase_amount: '',
    maximum_discount_amount: '',
    offer_code: '',
    start_date: '',
    end_date: '',
    is_active: true,
    is_featured: false,
    usage_limit: '',
    usage_limit_per_customer: '',
    customer_eligibility: 'all' as 'all' | 'new_customers' | 'existing_customers' | 'vip_customers',
    priority: '0',
    display_on_homepage: false,
    banner_text: '',
    banner_color: '#dc2626',
    terms_and_conditions: ''
  });

  const fetchOffers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/offers?include_expired=true');
      const data = await response.json();
      
      if (response.ok) {
        setOffers(data.offers || []);
      } else {
        throw new Error(data.error || 'Failed to fetch offers');
      }
    } catch (error) {
      logger.error('Error fetching offers in OffersManagement', { error });
      toast({
        title: 'Error',
        description: 'Failed to fetch offers',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  const handleSaveOffer = async () => {
    try {
      setIsSaving(true);

      // Validate required fields
      if (!formData.title || !formData.start_date || !formData.end_date) {
        toast({
          title: 'Error',
          description: 'Please fill in all required fields',
          variant: 'destructive'
        });
        return;
      }

      // Prepare the data
      const offerData = {
        ...formData,
        discount_value: formData.discount_value ? parseFloat(formData.discount_value) : null,
        minimum_purchase_amount: formData.minimum_purchase_amount ? parseFloat(formData.minimum_purchase_amount) : null,
        maximum_discount_amount: formData.maximum_discount_amount ? parseFloat(formData.maximum_discount_amount) : null,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
        usage_limit_per_customer: formData.usage_limit_per_customer ? parseInt(formData.usage_limit_per_customer) : null,
        priority: parseInt(formData.priority),
        offer_code: formData.offer_code || null
      };

      const url = '/api/offers';
      const method = editingOffer ? 'PUT' : 'POST';
      const body = editingOffer ? { id: editingOffer.id, ...offerData } : offerData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: 'Success',
          description: result.message
        });
        
        await fetchOffers();
        handleCloseDialog();
      } else {
        throw new Error(result.error || 'Failed to save offer');
      }
    } catch (error) {
      logger.error('Error saving offer in OffersManagement', { error, formData });
      toast({
        title: 'Error',
        description: (error as Error).message,
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditOffer = (offer: Offer) => {
    setEditingOffer(offer);
    setFormData({
      title: offer.title,
      description: offer.description || '',
      discount_type: offer.discount_type,
      discount_value: offer.discount_value?.toString() || '',
      minimum_purchase_amount: offer.minimum_purchase_amount?.toString() || '',
      maximum_discount_amount: offer.maximum_discount_amount?.toString() || '',
      offer_code: offer.offer_code || '',
      start_date: offer.start_date.split('T')[0],
      end_date: offer.end_date.split('T')[0],
      is_active: offer.is_active,
      is_featured: offer.is_featured,
      usage_limit: offer.usage_limit?.toString() || '',
      usage_limit_per_customer: offer.usage_limit_per_customer?.toString() || '',
      customer_eligibility: offer.customer_eligibility,
      priority: offer.priority.toString(),
      display_on_homepage: offer.display_on_homepage,
      banner_text: offer.banner_text || '',
      banner_color: offer.banner_color || '#dc2626',
      terms_and_conditions: offer.terms_and_conditions || ''
    });
    setShowCreateDialog(true);
  };

  const handleDeleteOffer = async (offer: Offer) => {
    if (!confirm(`Are you sure you want to delete "${offer.title}"?`)) return;

    try {
      const response = await fetch(`/api/offers?id=${offer.id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: 'Success',
          description: result.message
        });
        await fetchOffers();
      } else {
        throw new Error(result.error || 'Failed to delete offer');
      }
    } catch (error) {
      logger.error('Error deleting offer in OffersManagement', { error, offerId: offer.id });
      toast({
        title: 'Error',
        description: (error as Error).message,
        variant: 'destructive'
      });
    }
  };

  const toggleOfferStatus = async (offer: Offer) => {
    try {
      const response = await fetch('/api/offers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: offer.id,
          is_active: !offer.is_active
        })
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Offer ${!offer.is_active ? 'activated' : 'deactivated'}`
        });
        await fetchOffers();
      } else {
        throw new Error(result.error || 'Failed to update offer');
      }
    } catch (error) {
      logger.error('Error toggling offer status in OffersManagement', { error, offerId: offer.id });
      toast({
        title: 'Error',
        description: (error as Error).message,
        variant: 'destructive'
      });
    }
  };

  const handleCloseDialog = () => {
    setShowCreateDialog(false);
    setEditingOffer(null);
    setFormData({
      title: '',
      description: '',
      discount_type: 'percentage' as 'percentage' | 'fixed_amount' | 'buy_x_get_y' | 'free_shipping',
      discount_value: '',
      minimum_purchase_amount: '',
      maximum_discount_amount: '',
      offer_code: '',
      start_date: '',
      end_date: '',
      is_active: true,
      is_featured: false,
      usage_limit: '',
      usage_limit_per_customer: '',
      customer_eligibility: 'all' as 'all' | 'new_customers' | 'existing_customers' | 'vip_customers',
      priority: '0',
      display_on_homepage: false,
      banner_text: '',
      banner_color: '#dc2626',
      terms_and_conditions: ''
    });
  };

  const getDiscountDisplay = (offer: Offer) => {
    switch (offer.discount_type) {
      case 'percentage':
        return `${offer.discount_value}%`;
      case 'fixed_amount':
        return `₹${offer.discount_value}`;
      case 'free_shipping':
        return 'Free Shipping';
      case 'buy_x_get_y':
        return 'Buy X Get Y';
      default:
        return '-';
    }
  };

  const getStatusBadge = (offer: Offer) => {
    const now = new Date();
    const endDate = new Date(offer.end_date);
    const startDate = new Date(offer.start_date);

    if (!offer.is_active) {
      return <Badge variant="secondary">Inactive</Badge>;
    } else if (now > endDate) {
      return <Badge variant="destructive">Expired</Badge>;
    } else if (now < startDate) {
      return <Badge variant="outline">Scheduled</Badge>;
    } else {
      return <Badge variant="default">Active</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Offers Management</h1>
            <p className="text-gray-600">Create and manage promotional offers and discounts</p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Create Offer</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingOffer ? 'Edit Offer' : 'Create New Offer'}
                </DialogTitle>
                <DialogDescription>
                  {editingOffer ? 'Update the offer details below.' : 'Fill in the details to create a new promotional offer.'}
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                {/* Basic Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., 50% Off Tech Accessories"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Detailed description of the offer"
                      rows={3}
                    />
                  </div>
                </div>

                {/* Discount Configuration */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="discount_type">Discount Type *</Label>
                    <Select
                      value={formData.discount_type}
                      onValueChange={(value: any) => setFormData({ ...formData, discount_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                        <SelectItem value="free_shipping">Free Shipping</SelectItem>
                        <SelectItem value="buy_x_get_y">Buy X Get Y</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.discount_type !== 'free_shipping' && formData.discount_type !== 'buy_x_get_y' && (
                    <div>
                      <Label htmlFor="discount_value">
                        Discount Value {formData.discount_type === 'percentage' ? '(%)' : '(₹)'}
                      </Label>
                      <Input
                        id="discount_value"
                        type="number"
                        step="0.01"
                        value={formData.discount_value}
                        onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                        placeholder={formData.discount_type === 'percentage' ? '10' : '100'}
                      />
                    </div>
                  )}
                </div>

                {/* Offer Code and Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="offer_code">Offer Code (Optional)</Label>
                    <Input
                      id="offer_code"
                      value={formData.offer_code}
                      onChange={(e) => setFormData({ ...formData, offer_code: e.target.value.toUpperCase() })}
                      placeholder="SAVE20"
                    />
                  </div>
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Input
                      id="priority"
                      type="number"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_date">Start Date *</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_date">End Date *</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                  </div>
                </div>

                {/* Purchase Limits */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="minimum_purchase_amount">Minimum Purchase (₹)</Label>
                    <Input
                      id="minimum_purchase_amount"
                      type="number"
                      step="0.01"
                      value={formData.minimum_purchase_amount}
                      onChange={(e) => setFormData({ ...formData, minimum_purchase_amount: e.target.value })}
                      placeholder="500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="maximum_discount_amount">Maximum Discount (₹)</Label>
                    <Input
                      id="maximum_discount_amount"
                      type="number"
                      step="0.01"
                      value={formData.maximum_discount_amount}
                      onChange={(e) => setFormData({ ...formData, maximum_discount_amount: e.target.value })}
                      placeholder="1000"
                    />
                  </div>
                </div>

                {/* Usage Limits */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="usage_limit">Total Usage Limit</Label>
                    <Input
                      id="usage_limit"
                      type="number"
                      value={formData.usage_limit}
                      onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                      placeholder="100"
                    />
                  </div>
                  <div>
                    <Label htmlFor="usage_limit_per_customer">Usage Limit Per Customer</Label>
                    <Input
                      id="usage_limit_per_customer"
                      type="number"
                      value={formData.usage_limit_per_customer}
                      onChange={(e) => setFormData({ ...formData, usage_limit_per_customer: e.target.value })}
                      placeholder="1"
                    />
                  </div>
                </div>

                {/* Customer Eligibility */}
                <div>
                  <Label htmlFor="customer_eligibility">Customer Eligibility</Label>
                  <Select
                    value={formData.customer_eligibility}
                    onValueChange={(value: any) => setFormData({ ...formData, customer_eligibility: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Customers</SelectItem>
                      <SelectItem value="new_customers">New Customers Only</SelectItem>
                      <SelectItem value="existing_customers">Existing Customers</SelectItem>
                      <SelectItem value="vip_customers">VIP Customers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Banner Configuration */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="banner_text">Banner Text</Label>
                    <Input
                      id="banner_text"
                      value={formData.banner_text}
                      onChange={(e) => setFormData({ ...formData, banner_text: e.target.value })}
                      placeholder="Limited Time: 50% Off All Tech Accessories"
                    />
                  </div>
                  <div>
                    <Label htmlFor="banner_color">Banner Color</Label>
                    <Input
                      id="banner_color"
                      type="color"
                      value={formData.banner_color}
                      onChange={(e) => setFormData({ ...formData, banner_color: e.target.value })}
                    />
                  </div>
                </div>

                {/* Terms and Conditions */}
                <div>
                  <Label htmlFor="terms_and_conditions">Terms and Conditions</Label>
                  <Textarea
                    id="terms_and_conditions"
                    value={formData.terms_and_conditions}
                    onChange={(e) => setFormData({ ...formData, terms_and_conditions: e.target.value })}
                    placeholder="Enter terms and conditions for this offer"
                    rows={3}
                  />
                </div>

                {/* Switches */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="is_active">Active</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_featured"
                      checked={formData.is_featured}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                    />
                    <Label htmlFor="is_featured">Featured</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="display_on_homepage"
                      checked={formData.display_on_homepage}
                      onCheckedChange={(checked) => setFormData({ ...formData, display_on_homepage: checked })}
                    />
                    <Label htmlFor="display_on_homepage">Display on Homepage</Label>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button onClick={handleSaveOffer} disabled={isSaving}>
                  {isSaving ? 'Saving...' : editingOffer ? 'Update Offer' : 'Create Offer'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Gift className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Offers</p>
                  <p className="text-2xl font-bold text-gray-900">{offers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Offers</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {offers.filter(o => o.is_active && new Date(o.end_date) > new Date()).length}
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
                  <p className="text-sm font-medium text-gray-600">Featured Offers</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {offers.filter(o => o.is_featured).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Usage</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {offers.reduce((sum, o) => sum + o.usage_count, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Offers Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Offers</CardTitle>
            <CardDescription>
              Manage all promotional offers and discounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading offers...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offers.map((offer) => (
                    <TableRow key={offer.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{offer.title}</div>
                          <div className="text-sm text-gray-500 line-clamp-1">
                            {offer.description}
                          </div>
                          <div className="flex space-x-1 mt-1">
                            {offer.is_featured && (
                              <Badge variant="secondary" className="text-xs">Featured</Badge>
                            )}
                            {offer.display_on_homepage && (
                              <Badge variant="outline" className="text-xs">Homepage</Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">
                        {offer.discount_type.replace('_', ' ')}
                      </TableCell>
                      <TableCell>{getDiscountDisplay(offer)}</TableCell>
                      <TableCell>
                        {offer.offer_code ? (
                          <code className="bg-muted px-2 py-1 rounded text-xs">
                            {offer.offer_code}
                          </code>
                        ) : (
                          <span className="text-gray-400">Auto-apply</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{new Date(offer.start_date).toLocaleDateString()}</div>
                          <div className="text-gray-500">to {new Date(offer.end_date).toLocaleDateString()}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(offer)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{offer.usage_count}</div>
                          {offer.usage_limit && (
                            <div className="text-gray-500">of {offer.usage_limit}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleOfferStatus(offer)}
                          >
                            {offer.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditOffer(offer)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteOffer(offer)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}