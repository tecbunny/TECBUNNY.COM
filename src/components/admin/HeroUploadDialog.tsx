'use client';

import React, { useState } from 'react';

import { usePageContent } from '../../hooks/use-page-content';
import { useToast } from '../../hooks/use-toast';

import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';

interface HeroUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HeroUploadDialog({ isOpen, onClose }: HeroUploadDialogProps) {
  // Use server upload route to keep storage provider behavior consistent
  const { content, updateContent } = usePageContent('homepage');
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  if (!isOpen) return null;

  const handleFile = async (file: File) => {
    try {
      setUploading(true);
      // Upload via centralized server endpoint - it will use S3 or Supabase storage depending on configuration
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', 'hero');
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.secure_url && !json?.url) {
        const errMsg = json?.error || json?.message || `Upload failed (status ${res.status})`;
        throw new Error(errMsg);
      }
      const publicUrl = json?.secure_url || json?.url;
      
      // Update page content with new hero image
      const currentContent = content?.content || {};
      const currentHero = currentContent.hero || {
        title: "Welcome to TecBunny Store",
        subtitle: "Your one-stop destination for cutting-edge technology and premium electronics.",
        description: "Discover amazing deals and the latest products with fast delivery.",
        buttons: [
          { text: "Shop Now", link: "/products", type: "primary" },
          { text: "Special Deals & Offers", link: "/offers", type: "secondary", icon: "🔥" }
        ]
      };
      
      const updatedContent = {
        ...currentContent,
        hero: {
          ...currentHero,
          image: publicUrl
        }
      };
      
      const result = await updateContent({ content: updatedContent });
      
      if (result.success) {
        toast({ 
          title: 'Success!', 
          description: 'Hero banner image has been updated successfully.' 
        });
        onClose();
        // Force page refresh to show new image
        window.location.reload();
      } else {
        throw new Error(result.error || 'Failed to update content');
      }
    } catch (err) {
      toast({ 
        title: 'Upload error', 
        description: (err as Error).message, 
        variant: 'destructive' 
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Upload Hero Banner</CardTitle>
          <CardDescription>Select an image to use as homepage hero background</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = '';
            }}
            disabled={uploading}
          />
          <Button onClick={onClose} disabled={uploading}>Cancel</Button>
        </CardContent>
      </Card>
    </div>
  );
}