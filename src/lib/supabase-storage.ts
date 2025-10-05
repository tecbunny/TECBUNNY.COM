// Supabase Storage Service - Simple approach using Supabase client
import { createClient } from '@supabase/supabase-js';

import { logger } from './logger';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-role-placeholder';

export const isSupabaseStorageConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Create admin client for file uploads (uses placeholders when not configured)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function ensureSupabaseConfigured(operation: string) {
  if (!isSupabaseStorageConfigured) {
    logger.warn('supabase_storage_not_configured', { operation });
    throw new Error('Supabase storage is not configured');
  }
}

export interface SupabaseUploadResult {
  url: string;
  public_id: string;
  secure_url: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

/**
 * Upload file to Supabase Storage
 */
export async function uploadToSupabase(
  file: File | Buffer | string,
  folder: string = 'uploads',
  options?: {
    publicAccess?: boolean;
    fileName?: string;
  }
): Promise<SupabaseUploadResult> {
  try {
    ensureSupabaseConfigured('upload');

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    let fileName = options?.fileName || `${timestamp}-${randomId}`;
    
    // Add appropriate file extension if missing
    if (file instanceof File && !fileName.includes('.')) {
      const extension = file.name.split('.').pop();
      if (extension) {
        fileName += `.${extension}`;
      }
    }
    
    const filePath = `${folder}/${fileName}`;

    let fileBuffer: ArrayBuffer | Buffer;
    let contentType = 'application/octet-stream';

    // Handle different input types
    if (file instanceof File) {
      fileBuffer = await file.arrayBuffer();
      contentType = file.type;
    } else if (Buffer.isBuffer(file)) {
      fileBuffer = file;
    } else if (typeof file === 'string') {
      fileBuffer = Buffer.from(file, 'base64');
    } else {
      throw new Error('Invalid file format');
    }

    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from('images')
      .upload(filePath, fileBuffer, {
        contentType,
        upsert: true,
        cacheControl: '3600'
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);

    const result: SupabaseUploadResult = {
      url: publicUrlData.publicUrl,
      public_id: filePath,
      secure_url: publicUrlData.publicUrl,
      bytes: fileBuffer.byteLength || (fileBuffer as Buffer).length
    };

    return result;

  } catch (error) {
    logger.error('Supabase upload error:', { error });
    throw error;
  }
}

/**
 * Upload favicon to Supabase
 */
export async function uploadFavicon(file: File | Buffer): Promise<SupabaseUploadResult> {
  return uploadToSupabase(file, 'favicons', { publicAccess: true });
}

/**
 * Upload logo to Supabase
 */
export async function uploadLogo(file: File | Buffer): Promise<SupabaseUploadResult> {
  return uploadToSupabase(file, 'logos', { publicAccess: true });
}

/**
 * Upload product image to Supabase
 */
export async function uploadProductImage(file: File | Buffer): Promise<SupabaseUploadResult> {
  return uploadToSupabase(file, 'products', { publicAccess: true });
}

/**
 * Delete file from Supabase Storage
 */
export async function deleteFromSupabase(filePath: string): Promise<boolean> {
  try {
    ensureSupabaseConfigured('delete');

    const { error } = await supabase.storage
      .from('images')
      .remove([filePath]);

    if (error) {
      logger.error('Delete error:', { error });
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Delete error:', { error });
    return false;
  }
}

/**
 * Get signed URL for private files
 */
export async function getSupabaseSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
  try {
    ensureSupabaseConfigured('signed_url');

    const { data, error } = await supabase.storage
      .from('images')
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      throw new Error(`Failed to get signed URL: ${error.message}`);
    }

    return data.signedUrl;
  } catch (error) {
    logger.error('Signed URL error:', { error });
    throw error;
  }
}

