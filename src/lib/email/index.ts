// Export all email-related functionality
export * from './types';
export * from './templates';
export * from './service';
export * from './client';

// Re-export commonly used items
export { EMAIL_TEMPLATES } from './types';
export { generateEmailTemplate } from './templates';
export { EmailService, createEmailService, emailHelpers } from './service';
export { emailClient } from './client';

