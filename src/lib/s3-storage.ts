// AWS S3 Storage Service
import AWS from 'aws-sdk';

import { logger } from './logger';

const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;

export const isS3Configured = Boolean(
  AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY && S3_BUCKET_NAME
);

// Configure AWS
if (isS3Configured) {
  AWS.config.update({
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
    region: AWS_REGION
  });
}

const s3 = new AWS.S3();

function ensureS3Configured(operation: string) {
  if (!isS3Configured) {
    logger.warn('s3_storage_not_configured', { operation });
    throw new Error('S3 storage is not configured');
  }
}

export interface S3UploadResult {
  url: string;
  public_id: string;
  secure_url: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

/**
 * Upload file to S3
 */
export async function uploadToS3(
  file: File | Buffer | string,
  folder: string = 'uploads',
  options?: {
    publicAccess?: boolean;
    fileName?: string;
  }
): Promise<S3UploadResult> {
  try {
    ensureS3Configured('upload');

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

    const key = `${folder}/${fileName}`;

    let fileBuffer: Buffer;
    let contentType = 'application/octet-stream';

    // Handle different input types
    if (file instanceof File) {
      fileBuffer = Buffer.from(await file.arrayBuffer());
      contentType = file.type;
    } else if (Buffer.isBuffer(file)) {
      fileBuffer = file;
    } else if (typeof file === 'string') {
      fileBuffer = Buffer.from(file, 'base64');
    } else {
      throw new Error('Invalid file format');
    }

    // Upload to S3
    const uploadParams = {
      Bucket: S3_BUCKET_NAME!,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
      ACL: options?.publicAccess !== false ? 'public-read' : undefined,
      CacheControl: 'max-age=31536000' // 1 year
    };

    await s3.upload(uploadParams).promise();

    // Generate public URL
    const url = `https://${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`;

    const result: S3UploadResult = {
      url,
      public_id: key,
      secure_url: url,
      bytes: fileBuffer.length
    };

    return result;

  } catch (error) {
    logger.error('S3 upload error:', { error });
    throw error;
  }
}

/**
 * Upload hero banner image to S3
 */
export async function uploadHeroBanner(file: File | Buffer): Promise<S3UploadResult> {
  return uploadToS3(file, 'hero-banners', { publicAccess: true });
}

/**
 * Delete file from S3
 */
export async function deleteFromS3(key: string): Promise<boolean> {
  try {
    ensureS3Configured('delete');

    const deleteParams = {
      Bucket: S3_BUCKET_NAME!,
      Key: key
    };

    await s3.deleteObject(deleteParams).promise();
    return true;
  } catch (error) {
    logger.error('S3 delete error:', { error });
    return false;
  }
}

/**
 * Get signed URL for private S3 files
 */
export async function getS3SignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
  try {
    ensureS3Configured('signed_url');

    const signedUrlParams = {
      Bucket: S3_BUCKET_NAME!,
      Key: key,
      Expires: expiresIn
    };

    return s3.getSignedUrl('getObject', signedUrlParams);
  } catch (error) {
    logger.error('S3 signed URL error:', { error });
    throw error;
  }
}