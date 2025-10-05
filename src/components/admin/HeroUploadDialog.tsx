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
      const filePath = `hero-banner.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('hero-banners')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
        // Retrieve public URL of the uploaded file
        const getUrl = supabase.storage
          .from('hero-banners')
          .getPublicUrl(filePath);
        const publicUrl = getUrl.data.publicUrl;
      await updateContent({ content: { ...content?.content, hero: { ...content?.content?.hero, image: publicUrl } } });
      toast({ title: 'Hero banner updated', description: 'Homepage hero image updated' });
      onClose();
    } catch (err) {
      toast({ title: 'Upload error', description: (err as Error).message, variant: 'destructive' });
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