# S3 Configuration for Hero Banner

To configure AWS S3 for hero banner image uploads, add the following environment variables to your `.env.local` file:

```env
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your_s3_bucket_name
```

## Setup Steps

1. Create an S3 bucket in AWS Console
2. Configure the bucket for public read access (for hero banner images)
3. Create an IAM user with S3 permissions
4. Add the environment variables above
5. Hero banner images will now be uploaded to S3 instead of Supabase

## Usage

When uploading hero banner images through the admin interface, use upload type 'hero':

```javascript
const formData = new FormData();
formData.append('file', imageFile);
formData.append('type', 'hero');

fetch('/api/upload', {
  method: 'POST',
  body: formData
});
```

The uploaded image will be stored in the `hero-banners/` folder in your S3 bucket.