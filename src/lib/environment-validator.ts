// Environment variable validation and configuration
import { logger } from './logger';

export interface EnvironmentConfig {
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
  };
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    from: string;
    fromName: string;
  };
  sms: {
    twoFactorApiKey: string;
    senderId: string;
    baseUrl: string;
  };
  whatsapp: {
    accessToken: string;
    phoneNumberId: string;
    apiUrl: string;
  };
  app: {
    siteUrl: string;
    appName: string;
    nodeEnv: string;
  };
}

class EnvironmentValidator {
  private config: Partial<EnvironmentConfig> = {};
  private errors: string[] = [];
  private warnings: string[] = [];

  constructor() {
    this.validateEnvironment();
  }

  private validateEnvironment() {
    // Supabase Configuration
    this.config.supabase = {
      url: this.requireEnv('NEXT_PUBLIC_SUPABASE_URL', 'Supabase URL'),
      anonKey: this.requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'Supabase Anon Key'),
      serviceRoleKey: this.requireEnv('SUPABASE_SERVICE_ROLE_KEY', 'Supabase Service Role Key')
    };

    // SMTP Configuration
    this.config.smtp = {
      host: this.getEnv('SMTP_HOST', 'smtp.gmail.com'),
      port: parseInt(this.getEnv('SMTP_PORT', '587')),
      secure: this.getEnv('SMTP_SECURE', 'false') === 'true',
      user: this.optionalEnv('SMTP_USER', 'SMTP User'),
      pass: this.optionalEnv('SMTP_PASS', 'SMTP Password'),
      from: this.getEnv('SMTP_FROM', 'noreply@tecbunny.com'),
      fromName: this.getEnv('SMTP_FROM_NAME', 'TecBunny Solutions')
    };

    // SMS Configuration
    this.config.sms = {
      twoFactorApiKey: this.optionalEnv('TWOFACTOR_API_KEY', '2Factor API Key'),
      senderId: this.getEnv('TWOFACTOR_SENDER_ID', 'TECBNY'),
      baseUrl: this.getEnv('TWOFACTOR_BASE_URL', 'https://2factor.in/API')
    };

    // WhatsApp Configuration
    this.config.whatsapp = {
      accessToken: this.optionalEnv('WHATSAPP_ACCESS_TOKEN', 'WhatsApp Access Token'),
      phoneNumberId: this.optionalEnv('WHATSAPP_PHONE_NUMBER_ID', 'WhatsApp Phone Number ID'),
      apiUrl: this.getEnv('WHATSAPP_API_URL', 'https://graph.facebook.com/v18.0')
    };

    // App Configuration
    this.config.app = {
      siteUrl: this.getEnv('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000'),
      appName: this.getEnv('NEXT_PUBLIC_APP_NAME', 'TecBunny Solutions'),
      nodeEnv: this.getEnv('NODE_ENV', 'development')
    };

    this.reportValidationResults();
  }

  private requireEnv(key: string, description: string): string {
    const value = process.env[key];
    if (!value) {
      this.errors.push(`Missing required environment variable: ${key} (${description})`);
      return '';
    }
    return value;
  }

  private optionalEnv(key: string, _description: string): string {
    const value = process.env[key];
    // Silently return empty for optional env vars - no warnings needed
    return value || '';
  }

  private getEnv(key: string, defaultValue: string): string {
    return process.env[key] || defaultValue;
  }

  private reportValidationResults() {
    if (this.errors.length > 0) {
      logger.error('Environment validation failed', { 
        errors: this.errors 
      });

      if (process.env.STRICT_ENV_VALIDATION === 'true') {
        throw new Error(`Environment validation failed: ${this.errors.join(', ')}`);
      }
    }

    // Only log validation completion in development mode
    if (process.env.NODE_ENV !== 'production') {
      logger.info('Environment validation completed', {
        errorsCount: this.errors.length,
        nodeEnv: this.config.app?.nodeEnv
      });
    }
  }

  getConfig(): EnvironmentConfig {
    return this.config as EnvironmentConfig;
  }

  isValid(): boolean {
    return this.errors.length === 0;
  }

  getErrors(): string[] {
    return this.errors;
  }

  getWarnings(): string[] {
    return this.warnings;
  }

  // Feature availability checks
  isSMSEnabled(): boolean {
    return !!(this.config.sms?.twoFactorApiKey);
  }

  isEmailEnabled(): boolean {
    return !!(this.config.smtp?.user && this.config.smtp?.pass);
  }

  isWhatsAppEnabled(): boolean {
    return !!(this.config.whatsapp?.accessToken && this.config.whatsapp?.phoneNumberId);
  }

  isSupabaseEnabled(): boolean {
    return !!(this.config.supabase?.url && this.config.supabase?.serviceRoleKey);
  }

  getFeatureStatus() {
    return {
      sms: this.isSMSEnabled(),
      email: this.isEmailEnabled(),
      whatsapp: this.isWhatsAppEnabled(),
      database: this.isSupabaseEnabled(),
      dualChannelOTP: this.isSMSEnabled() && this.isEmailEnabled(),
      notifications: this.isWhatsAppEnabled() || this.isEmailEnabled()
    };
  }
}

// Export singleton instance
export const environmentValidator = new EnvironmentValidator();
export const envConfig = environmentValidator.getConfig();
export default environmentValidator;