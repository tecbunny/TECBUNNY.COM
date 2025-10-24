'use client';

import React, { useState } from 'react';

import { createClient } from '../../lib/supabase/client';
import { usePageContent } from '../../hooks/use-page-content';
import { useToast } from '../../hooks/use-toast';

import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';

interface HeroUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HeroUploadDialog({ isOpen, onClose }: HeroUploadDialogProps) {
  const supabase = createClient();
  const { content, updateContent } = usePageContent('homepage');
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  if (!isOpen) return null;

  const handleFile = async (file: File) => {
    try {
      setUploading(true);
      const ext = file.name.split('.').pop();
      const filePath = `hero-banner-${Date.now()}.${ext}`;
      
      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('hero-banners')
        .upload(filePath, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      // Get public URL of the uploaded file
      const { data: urlData } = supabase.storage
        .from('hero-banners')
        .getPublicUrl(filePath);
      
      const publicUrl = urlData.publicUrl;
      
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