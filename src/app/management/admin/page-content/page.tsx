'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';

import { 
  Edit2, 
  Save, 
  RefreshCw, 
  FileText,
  Eye,
  EyeOff
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import { Textarea } from '../../../../components/ui/textarea';
import { Badge } from '../../../../components/ui/badge';
import { useAllPageContents } from '../../../../hooks/use-page-content';

interface PageContent {
  id: string;
  page_key: string;
  title: string;
  content: unknown;
  meta_description?: string;
  meta_keywords?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function PageContentAdmin() {
  const { contents, loading, error, refetch } = useAllPageContents();
  const [selectedPage, setSelectedPage] = useState<PageContent | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    meta_description: '',
    meta_keywords: '',
    status: 'published'
  });
  const [saving, setSaving] = useState(false);
  const [showJsonRaw, setShowJsonRaw] = useState(false);

  useEffect(() => {
    if (selectedPage) {
      setFormData({
        title: selectedPage.title,
        content: typeof selectedPage.content === 'string' 
          ? selectedPage.content 
          : JSON.stringify(selectedPage.content, null, 2),
        meta_description: selectedPage.meta_description || '',
        meta_keywords: selectedPage.meta_keywords || '',
        status: selectedPage.status
      });
    }
  }, [selectedPage]);

  const handleSave = async () => {
    if (!selectedPage) return;

    setSaving(true);
    try {
      let contentData;
      try {
        contentData = JSON.parse(formData.content);
      } catch {
        contentData = formData.content;
      }

      const response = await fetch('/api/page-content', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pageKey: selectedPage.page_key,
          title: formData.title,
          content: contentData,
          metaDescription: formData.meta_description,
          metaKeywords: formData.meta_keywords,
          status: formData.status
        }),
      });

      if (response.ok) {
        setEditMode(false);
        refetch();
        alert('Page content updated successfully!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error saving page content');
    } finally {
      setSaving(false);
    }
  };

  const formatPageKey = (key: string) => {
    return key.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading page contents...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Error Loading Content</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={refetch} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filter to only show homepage content (if it exists)
  const homepageContent = contents.find(page => page.page_key === 'homepage');
  const editableContents = homepageContent ? [homepageContent] : [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Homepage Content Management</h1>
        <p className="text-gray-600 mt-2">
          Edit your homepage content. Other pages are now static for better performance and simplicity.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Simplified Content Management</h4>
              <p className="text-sm text-blue-700 mt-1">
                Only the homepage is now editable to reduce complexity. Other pages (About, Contact, etc.) are kept static. 
                If you need to modify other pages, please edit the code directly.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Page List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Editable Page
            </CardTitle>
            <CardDescription>
              Homepage content management
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {editableContents.length > 0 ? (
              editableContents.map((page) => (
                <div
                  key={page.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedPage?.id === page.id
                      ? 'bg-blue-50 border-blue-200'
                      : 'hover:bg-gray-50 border-gray-200'
                  }`}
                  onClick={() => {
                    setSelectedPage(page);
                    setEditMode(false);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{formatPageKey(page.page_key)}</h4>
                      <p className="text-sm text-gray-500">{page.title}</p>
                    </div>
                    <Badge variant={page.status === 'published' ? 'default' : 'secondary'}>
                      {page.status}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-sm">
                  No homepage content found. You may need to create it first.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Content Editor */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Edit2 className="h-5 w-5" />
                  {selectedPage ? formatPageKey(selectedPage.page_key) : 'Select a Page'}
                </CardTitle>
                {selectedPage && (
                  <CardDescription>
                    Last updated: {new Date(selectedPage.updated_at).toLocaleString()}
                  </CardDescription>
                )}
              </div>
              {selectedPage && (
                <div className="flex gap-2">
                  {editMode ? (
                    <>
                      <Button
                        onClick={() => setEditMode(false)}
                        variant="outline"
                        size="sm"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSave}
                        disabled={saving}
                        size="sm"
                      >
                        {saving ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Save
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={() => setEditMode(true)}
                      size="sm"
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedPage ? (
              editMode ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="content">Content</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowJsonRaw(!showJsonRaw)}
                      >
                        {showJsonRaw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        {showJsonRaw ? 'Hide' : 'Show'} Raw JSON
                      </Button>
                    </div>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      rows={15}
                      className="font-mono text-sm"
                    />
                  </div>

                  <div>
                    <Label htmlFor="meta_description">Meta Description</Label>
                    <Textarea
                      id="meta_description"
                      value={formData.meta_description}
                      onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label htmlFor="meta_keywords">Meta Keywords</Label>
                    <Input
                      id="meta_keywords"
                      value={formData.meta_keywords}
                      onChange={(e) => setFormData({ ...formData, meta_keywords: e.target.value })}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">{selectedPage.title}</h3>
                    <Badge variant={selectedPage.status === 'published' ? 'default' : 'secondary'}>
                      {selectedPage.status}
                    </Badge>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Content Preview:</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <pre className="text-sm overflow-x-auto">
                        {typeof selectedPage.content === 'string' 
                          ? selectedPage.content 
                          : JSON.stringify(selectedPage.content, null, 2)}
                      </pre>
                    </div>
                  </div>

                  {selectedPage.meta_description && (
                    <div>
                      <h4 className="font-medium mb-2">Meta Description:</h4>
                      <p className="text-sm text-gray-600">{selectedPage.meta_description}</p>
                    </div>
                  )}

                  {selectedPage.meta_keywords && (
                    <div>
                      <h4 className="font-medium mb-2">Meta Keywords:</h4>
                      <p className="text-sm text-gray-600">{selectedPage.meta_keywords}</p>
                    </div>
                  )}
                </div>
              )
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Select a page from the list to view and edit its content.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}