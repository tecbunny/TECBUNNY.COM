'use client';

import * as React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';

import { 
  Plus,
  Edit2, 
  RefreshCw, 
  FileText,
  Shield,
  Truck,
  RotateCcw,
  Eye,
  ExternalLink,
  X
} from 'lucide-react';

import Link from 'next/link';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { useToast } from '../../hooks/use-toast';
import { logger } from '../../lib/logger';


interface PolicyContent {
  id: string;
  page_key: string;
  title: string;
  content: {
    title?: string;
    lastUpdated?: string;
    introduction?: string[];
    sections?: Array<{
      title: string;
      content?: string[];
      list?: string[];
    }>;
  };
  meta_description?: string;
  meta_keywords?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface PolicySection {
  title: string;
  content?: string[];
  list?: string[];
}

export default function PoliciesManagement() {
  const [policies, setPolicies] = useState<PolicyContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPolicy, setSelectedPolicy] = useState<PolicyContent | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    introduction: '',
    meta_description: '',
    meta_keywords: '',
    status: 'published',
    sections: [] as PolicySection[]
  });

  const policyTypes = useMemo(() => [
    {
      key: 'privacy_policy',
      title: 'Privacy Policy',
      description: 'How we collect, use, and protect personal information',
      icon: Shield,
      defaultTitle: 'Privacy Policy'
    },
    {
      key: 'terms_of_service',
      title: 'Terms of Service',
      description: 'Terms and conditions of using our platform',
      icon: FileText,
      defaultTitle: 'Terms of Service'
    },
    {
      key: 'shipping_policy',
      title: 'Shipping Policy',
      description: 'Shipping methods, costs, and delivery information',
      icon: Truck,
      defaultTitle: 'Shipping Policy'
    },
    {
      key: 'return_policy',
      title: 'Return Policy',
      description: 'Guidelines for returns, exchanges, and refunds',
      icon: RotateCcw,
      defaultTitle: 'Return & Exchange Policy'
    }
  ], []);

  const fetchPolicies = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/page-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list_all' })
      });

      const result = await response.json();
      if (response.ok) {
        // Filter only policy-related content
        const policyKeys = policyTypes.map(p => p.key);
        const policyContents = result.data.filter((content: PolicyContent) => 
          policyKeys.includes(content.page_key)
        );
        setPolicies(policyContents);
      } else {
        throw new Error(result.error || 'Failed to fetch policies');
      }
    } catch (error) {
      logger.error('Error fetching policies in PoliciesManagement', { error });
      toast({
        title: 'Error',
        description: 'Failed to fetch policies',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast, policyTypes]);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  const handleEditPolicy = (policy: PolicyContent | null, policyKey?: string) => {
    if (policy) {
      setSelectedPolicy(policy);
      const content = policy.content || {};
      setFormData({
        title: content.title || policy.title,
        introduction: Array.isArray(content.introduction) ? content.introduction.join('\n\n') : '',
        meta_description: policy.meta_description || '',
        meta_keywords: policy.meta_keywords || '',
        status: policy.status || 'published',
        sections: (content.sections || []).map(section => ({
          title: section.title || '',
          content: section.content || [],
          list: section.list || []
        }))
      });
    } else if (policyKey) {
      // Creating new policy
      const policyType = policyTypes.find(p => p.key === policyKey);
      setSelectedPolicy({
        id: '',
        page_key: policyKey,
        title: policyType?.defaultTitle || 'New Policy',
        content: {},
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as PolicyContent);
      setFormData({
        title: policyType?.defaultTitle || 'New Policy',
        introduction: '',
        meta_description: policyType?.description || '',
        meta_keywords: '',
        status: 'draft',
        sections: []
      });
    }
    setShowEditDialog(true);
  };

  const handleSavePolicy = async () => {
    if (!selectedPolicy) return;

    try {
      setSaving(true);
      
      // Prepare content structure
      const content = {
        title: formData.title,
        lastUpdated: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        introduction: formData.introduction.split('\n\n').filter(Boolean),
        sections: formData.sections
      };

      const response = await fetch('/api/page-content', {
        method: selectedPolicy.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageKey: selectedPolicy.page_key,
          title: formData.title,
          content,
          metaDescription: formData.meta_description,
          metaKeywords: formData.meta_keywords,
          status: formData.status
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Policy updated successfully'
        });
        await fetchPolicies();
        setShowEditDialog(false);
        setSelectedPolicy(null);
      } else {
        throw new Error(result.error || 'Failed to save policy');
      }
    } catch (error) {
      logger.error('Error saving policy in PoliciesManagement', { error, formData });
      toast({
        title: 'Error',
        description: (error as Error).message,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const addSection = () => {
    setFormData({
      ...formData,
      sections: [...formData.sections, { title: '', content: [], list: [] }]
    });
  };

  const updateSection = (index: number, field: keyof PolicySection, value: any) => {
    const newSections = [...formData.sections];
    if (field === 'content' && Array.isArray(value)) {
      newSections[index] = { ...newSections[index], content: value };
    } else if (field === 'list' && Array.isArray(value)) {
      newSections[index] = { ...newSections[index], list: value };
    } else {
      newSections[index] = { ...newSections[index], [field]: value };
    }
    setFormData({ ...formData, sections: newSections });
  };

  const removeSection = (index: number) => {
    setFormData({
      ...formData,
      sections: formData.sections.filter((_, i) => i !== index)
    });
  };

  const addContentParagraph = (sectionIndex: number) => {
    const newSections = [...formData.sections];
    if (!newSections[sectionIndex].content) {
      newSections[sectionIndex].content = [];
    }
    newSections[sectionIndex].content!.push('');
    setFormData({ ...formData, sections: newSections });
  };

  const updateContentParagraph = (sectionIndex: number, paragraphIndex: number, value: string) => {
    const newSections = [...formData.sections];
    if (!newSections[sectionIndex].content) {
      newSections[sectionIndex].content = [];
    }
    newSections[sectionIndex].content![paragraphIndex] = value;
    setFormData({ ...formData, sections: newSections });
  };

  const removeContentParagraph = (sectionIndex: number, paragraphIndex: number) => {
    const newSections = [...formData.sections];
    if (newSections[sectionIndex].content) {
      newSections[sectionIndex].content = newSections[sectionIndex].content!.filter((_, i) => i !== paragraphIndex);
    }
    setFormData({ ...formData, sections: newSections });
  };

  const addListItem = (sectionIndex: number) => {
    const newSections = [...formData.sections];
    if (!newSections[sectionIndex].list) {
      newSections[sectionIndex].list = [];
    }
    newSections[sectionIndex].list!.push('');
    setFormData({ ...formData, sections: newSections });
  };

  const updateListItem = (sectionIndex: number, itemIndex: number, value: string) => {
    const newSections = [...formData.sections];
    if (!newSections[sectionIndex].list) {
      newSections[sectionIndex].list = [];
    }
    newSections[sectionIndex].list![itemIndex] = value;
    setFormData({ ...formData, sections: newSections });
  };

  const removeListItem = (sectionIndex: number, itemIndex: number) => {
    const newSections = [...formData.sections];
    if (newSections[sectionIndex].list) {
      newSections[sectionIndex].list = newSections[sectionIndex].list!.filter((_, i) => i !== itemIndex);
    }
    setFormData({ ...formData, sections: newSections });
  };

  const getPolicyInfo = (pageKey: string) => {
    return policyTypes.find(p => p.key === pageKey);
  };

  const getExistingPolicy = (pageKey: string) => {
    return policies.find(p => p.page_key === pageKey);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Policy Management</h1>
            <p className="text-gray-600">Manage legal documents and policies for your store</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/info/policies" target="_blank">
              <Eye className="h-4 w-4 mr-2" />
              View Public Policies
              <ExternalLink className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>

        {/* Policy Types Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {policyTypes.map((policyType) => {
            const IconComponent = policyType.icon;
            const existingPolicy = getExistingPolicy(policyType.key);
            
            return (
              <Card key={policyType.key} className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <IconComponent className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{policyType.title}</CardTitle>
                        {existingPolicy && (
                          <Badge variant={existingPolicy.status === 'published' ? 'default' : 'secondary'}>
                            {existingPolicy.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <CardDescription>{policyType.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {existingPolicy ? (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Last updated: {new Date(existingPolicy.updated_at).toLocaleDateString()}
                      </p>
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleEditPolicy(existingPolicy)}
                          className="flex-1"
                        >
                          <Edit2 className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          asChild
                        >
                          <Link href={`/info/policies/${policyType.key.replace('_policy', '').replace('_service', '')}`} target="_blank">
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleEditPolicy(null, policyType.key)}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Policy
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading policies...</p>
          </div>
        )}

        {/* Edit Policy Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedPolicy?.id ? 'Edit Policy' : 'Create New Policy'}
              </DialogTitle>
              <DialogDescription>
                {selectedPolicy && getPolicyInfo(selectedPolicy.page_key)?.description}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Policy Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter policy title"
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-input bg-background rounded-md"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>

              {/* Meta Information */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="meta_description">Meta Description</Label>
                  <Input
                    id="meta_description"
                    value={formData.meta_description}
                    onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                    placeholder="SEO description for this policy"
                  />
                </div>
                <div>
                  <Label htmlFor="meta_keywords">Meta Keywords</Label>
                  <Input
                    id="meta_keywords"
                    value={formData.meta_keywords}
                    onChange={(e) => setFormData({ ...formData, meta_keywords: e.target.value })}
                    placeholder="Keywords separated by commas"
                  />
                </div>
              </div>

              {/* Introduction */}
              <div>
                <Label htmlFor="introduction">Introduction</Label>
                <Textarea
                  id="introduction"
                  value={formData.introduction}
                  onChange={(e) => setFormData({ ...formData, introduction: e.target.value })}
                  placeholder="Enter introduction paragraphs. Separate paragraphs with double line breaks."
                  rows={4}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Separate paragraphs with double line breaks (press Enter twice)
                </p>
              </div>

              {/* Sections */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Label>Policy Sections</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addSection}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Section
                  </Button>
                </div>

                {formData.sections.map((section, sectionIndex) => (
                  <Card key={sectionIndex} className="mb-4">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <Label>Section {sectionIndex + 1}</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSection(sectionIndex)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <Input
                        value={section.title}
                        onChange={(e) => updateSection(sectionIndex, 'title', e.target.value)}
                        placeholder="Section title"
                      />
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Content Paragraphs */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-sm">Content Paragraphs</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addContentParagraph(sectionIndex)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Paragraph
                          </Button>
                        </div>
                        {(section.content || []).map((paragraph, paragraphIndex) => (
                          <div key={paragraphIndex} className="flex gap-2 mb-2">
                            <Textarea
                              value={paragraph}
                              onChange={(e) => updateContentParagraph(sectionIndex, paragraphIndex, e.target.value)}
                              placeholder="Enter paragraph content"
                              rows={2}
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeContentParagraph(sectionIndex, paragraphIndex)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      {/* List Items */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-sm">List Items (Optional)</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addListItem(sectionIndex)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Item
                          </Button>
                        </div>
                        {(section.list || []).map((item, itemIndex) => (
                          <div key={itemIndex} className="flex gap-2 mb-2">
                            <Input
                              value={item}
                              onChange={(e) => updateListItem(sectionIndex, itemIndex, e.target.value)}
                              placeholder="Enter list item"
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeListItem(sectionIndex, itemIndex)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSavePolicy} disabled={saving}>
                {saving ? 'Saving...' : 'Save Policy'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}