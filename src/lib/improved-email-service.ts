import nodemailer from 'nodemailer';

import { logger } from './logger';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  waitTime?: number;
}

class ImprovedEmailService {
  private transporter!: nodemailer.Transporter;
  private backupTransporter?: nodemailer.Transporter;
  private config: {
    from: string;
    fromName: string;
  };
  private rateLimiter: Map<string, { 
    count: number; 
    firstSentAt: number; 
    lastSentAt: number;
    cooldownUntil?: number;
  }> = new Map();
  private lastSendTime: number = 0;
  private isMainServiceDown: boolean = false;
  private isBackupServiceDown: boolean = false;
  private lastMainServiceCheck: number = 0;
  private lastBackupServiceCheck: number = 0;

  constructor() {
    this.config = {
      from: process.env.SMTP_FROM || 'tecbunnysolution@gmail.com',
      fromName: process.env.SMTP_FROM_NAME || 'TecBunny Store'
    };

    // Primary transporter (Gmail - verified working)
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: (process.env.SMTP_HOST || 'smtp.gmail.com').trim().replace(/[\r\n]/g, ''),
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false
        },
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        rateLimit: 10,
      });
    } else {
  logger.warn('SMTP credentials missing; email sending disabled');
    }

    // Backup transporter (Outlook/Hotmail)
    if (process.env.BACKUP_SMTP_USER && process.env.BACKUP_SMTP_PASS) {
      this.backupTransporter = nodemailer.createTransport({
        host: (process.env.BACKUP_SMTP_HOST || 'smtp-mail.outlook.com').trim().replace(/[\r\n]/g, ''),
        port: parseInt(process.env.BACKUP_SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.BACKUP_SMTP_USER,
          pass: process.env.BACKUP_SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false
        },
      });
    }

    this.verifyConnections();
  }

  private async verifyConnections() {
    try {
      if (!this.transporter) throw new Error('Primary transporter not configured');
  await this.transporter.verify();
  logger.info('Primary SMTP connection verified');
      this.isMainServiceDown = false;
    } catch (error) {
  logger.error('Primary SMTP connection failed', { error });
      this.isMainServiceDown = true;
    }

    // Test backup connection if available
    if (this.backupTransporter) {
      try {
  await this.backupTransporter.verify();
  logger.info('Backup SMTP connection verified');
        this.isBackupServiceDown = false;
      } catch (error) {
  logger.warn('Backup SMTP connection failed', { error });
        this.isBackupServiceDown = true;
      }
    }
  }

  public async getConnectionStatus() {
    await this.verifyConnections();
    
    return {
      primary: {
        status: this.isMainServiceDown ? 'down' : 'up',
        host: (process.env.SMTP_HOST || 'smtp.gmail.com').trim().replace(/[\r\n]/g, '')
      },
      backup: this.backupTransporter ? {
        status: this.isBackupServiceDown ? 'down' : 'up',
        host: (process.env.BACKUP_SMTP_HOST || 'smtp-mail.outlook.com').trim().replace(/[\r\n]/g, '')
      } : { status: 'not_configured' }
    };
  }

  private checkRateLimit(email: string): { 
    allowed: boolean; 
    message?: string; 
    waitTime?: number;
    resetCooldown?: boolean;
  } {
    // In local development, skip rate limiting to avoid blocking iterative testing
    if (process.env.NODE_ENV !== 'production') {
      return { allowed: true };
    }
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const fiveMinutes = 5 * 60 * 1000;
    
    // Global rate limiting: max 1 email per 500ms for faster OTP delivery
    if (now - this.lastSendTime < 500) {
      return { 
        allowed: false, 
        message: 'Please wait a moment before sending another email',
        waitTime: Math.ceil((500 - (now - this.lastSendTime)) / 1000)
      };
    }
    
    const userLimit = this.rateLimiter.get(email);
    
    if (!userLimit) {
      // First email for this user
      this.rateLimiter.set(email, { 
        count: 1, 
        firstSentAt: now, 
        lastSentAt: now 
      });
      return { allowed: true };
    }
    
    // Check if user is in cooldown period
    if (userLimit.cooldownUntil && now < userLimit.cooldownUntil) {
      const remainingCooldown = Math.ceil((userLimit.cooldownUntil - now) / 1000);
      return { 
        allowed: false, 
        message: `Account temporarily restricted. Please wait ${Math.ceil(remainingCooldown / 60)} minutes before requesting another email.`,
        waitTime: remainingCooldown
      };
    }
    
    // Reset cooldown if time has passed
    if (userLimit.cooldownUntil && now >= userLimit.cooldownUntil) {
      userLimit.cooldownUntil = undefined;
      userLimit.count = 0;
      userLimit.firstSentAt = now;
    }
    
    // Check if it's been more than an hour since the first email
    if (now - userLimit.firstSentAt > oneHour) {
      // Reset the counter
      this.rateLimiter.set(email, { 
        count: 1, 
        firstSentAt: now, 
        lastSentAt: now 
      });
      return { allowed: true };
    }
    
    // Progressive rate limiting based on count (relaxed for OTP)
    let maxEmails = 10; // Allow more OTP attempts
    let minInterval = 10000; // 10 seconds
    
    if (userLimit.count >= 5) {
      maxEmails = 15;
      minInterval = 30000; // 30 seconds
    }
    
    if (userLimit.count >= 10) {
      maxEmails = 20;
      minInterval = 60000; // 1 minute
    }
    
    // Check if user has exceeded limit
    if (userLimit.count >= maxEmails) {
      // Set cooldown period
      userLimit.cooldownUntil = now + fiveMinutes;
      this.rateLimiter.set(email, userLimit);
      return { 
        allowed: false, 
        message: `Too many email requests. Please wait 5 minutes before trying again.`,
        waitTime: 300
      };
    }
    
    // Check minimum time between emails
    if (now - userLimit.lastSentAt < minInterval) {
      const waitTime = Math.ceil((minInterval - (now - userLimit.lastSentAt)) / 1000);
      return { 
        allowed: false, 
        message: `Please wait ${waitTime} seconds before requesting another email`,
        waitTime
      };
    }
    
    // Update the counter
    userLimit.count++;
    userLimit.lastSentAt = now;
    this.rateLimiter.set(email, userLimit);
    
    return { allowed: true };
  }

  private async sendWithTransporter(
    transporter: nodemailer.Transporter, 
    options: EmailOptions,
    transporterName: string
  ): Promise<EmailResult> {
    try {
      // Ensure DMARC/SPF alignment: use SMTP_USER domain for From if different from desired business address
      const smtpUser = process.env.SMTP_USER || '';
      const desiredFrom = this.config.from;
      const getDomain = (addr: string) => (addr.split('@')[1] || '').toLowerCase();
      const fromDomain = getDomain(desiredFrom);
      const smtpDomain = getDomain(smtpUser);

      // If domains differ, send From as SMTP user (aligned) and set Reply-To to business address
      const useAlignedFrom = !!smtpUser && smtpDomain && fromDomain && smtpDomain !== fromDomain;
      const alignedFromAddress = useAlignedFrom ? smtpUser : desiredFrom;
      const replyToAddress = useAlignedFrom ? desiredFrom : undefined;

      const mailOptions: nodemailer.SendMailOptions = {
        from: `${this.config.fromName} <${alignedFromAddress}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ''),
        replyTo: replyToAddress,
        headers: useAlignedFrom && smtpUser ? { Sender: smtpUser } : undefined,
      };

      logger.info('Sending email', {
        transporter: transporterName,
        to: options.to,
        subject: options.subject,
        replyTo: replyToAddress ?? null,
      });
      
      if (!transporter) {
        // Dev fallback: when SMTP isn't configured, allow local testing by logging the email
        if (process.env.NODE_ENV !== 'production') {
          logger.warn('Email transporter not configured; using development fallback');
          logger.debug('Dev email preview', {
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text ?? null,
          });
          return { success: true, messageId: 'dev-logged' };
        }
        throw new Error('Email transporter not configured');
      }
      const result = await transporter.sendMail(mailOptions);

      logger.info('Email sent successfully', {
        transporter: transporterName,
        messageId: result.messageId,
        accepted: result.accepted,
        rejected: result.rejected,
        pending: (result as any).pending,
        response: result.response,
      });

      return { success: true, messageId: result.messageId };
    } catch (error) {
      logger.error('Failed to send email', { transporter: transporterName, error });
      
      // Parse specific error messages
      let errorMessage = 'Failed to send email';
      if (error instanceof Error) {
        if (error.message.includes('rate limit') || error.message.includes('quota')) {
          errorMessage = 'Email service rate limit reached. Please try again later.';
        } else if (error.message.includes('authentication') || error.message.includes('auth')) {
          errorMessage = 'Email service authentication failed. Please contact support.';
        } else if (error.message.includes('network') || error.message.includes('connection')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      return { success: false, error: errorMessage };
    }
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      logger.info('sendEmail.start', { to: options.to, subject: options.subject });
      
      // Check rate limiting first
      const rateLimitCheck = this.checkRateLimit(options.to);
      if (!rateLimitCheck.allowed) {
        logger.warn('sendEmail.rate_limited', { to: options.to, waitTime: rateLimitCheck.waitTime });
        return { 
          success: false, 
          error: rateLimitCheck.message,
          waitTime: rateLimitCheck.waitTime
        };
      }
      
      logger.info('sendEmail.rate_limit_passed', { to: options.to });

      // Check if main service needs to be retested
      const now = Date.now();
      if (this.isMainServiceDown && now - this.lastMainServiceCheck > 300000) { // 5 minutes
        this.lastMainServiceCheck = now;
        try {
          await this.transporter.verify();
          logger.info('Primary SMTP service recovered');
          this.isMainServiceDown = false;
        } catch {
          logger.warn('Primary SMTP service still down');
        }
      }

      // Check backup service if needed
      if (this.backupTransporter && this.isBackupServiceDown && now - this.lastBackupServiceCheck > 300000) {
        this.lastBackupServiceCheck = now;
        try {
          await this.backupTransporter.verify();
          logger.info('Backup SMTP service recovered');
          this.isBackupServiceDown = false;
        } catch {
          logger.warn('Backup SMTP service still down');
        }
      }

      let result: EmailResult;

      // Try primary transporter first (if not down)
      if (!this.isMainServiceDown) {
        result = await this.sendWithTransporter(this.transporter, options, 'Primary SMTP');
        
        if (result.success) {
          this.lastSendTime = now;
          return result;
        } else {
          // Mark primary as down if it fails
          this.isMainServiceDown = true;
          this.lastMainServiceCheck = now;
        }
      }

      // Try backup transporter if primary failed
      if (this.backupTransporter && !this.isBackupServiceDown) {
  logger.warn('Primary SMTP failed; attempting backup service');
        result = await this.sendWithTransporter(this.backupTransporter, options, 'Backup SMTP');
        
        if (result.success) {
          this.lastSendTime = now;
          return result;
        } else {
          this.isBackupServiceDown = true;
          this.lastBackupServiceCheck = now;
        }
      }

      // If primary failed, return error
      return {
        success: false,
        error: 'Email service is currently unavailable. Please try again in a few minutes or contact support.'
      };

    } catch (error) {
      logger.error('Unexpected error in sendEmail', { error });
      return {
        success: false,
        error: 'An unexpected error occurred while sending email'
      };
    }
  }

  async sendOTPEmail(
    email: string, 
    otp: string, 
    type: 'signup' | 'recovery' = 'signup'
  ): Promise<EmailResult> {
    const subject = type === 'signup' 
      ? 'Verify Your Email - TecBunny Store' 
      : 'Password Recovery Code - TecBunny Store';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: #ffffff; 
          }
          .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 30px 20px; 
            text-align: center; 
          }
          .content { 
            padding: 40px 20px; 
            background: #f8f9fa; 
          }
          .otp-section { 
            background: #ffffff; 
            border: 3px dashed #667eea; 
            padding: 30px; 
            text-align: center; 
            margin: 30px 0; 
            border-radius: 12px; 
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .otp-code { 
            font-size: 36px; 
            font-weight: bold; 
            color: #667eea; 
            letter-spacing: 8px; 
            margin: 10px 0; 
          }
          .warning-box { 
            background: #fff3cd; 
            border: 1px solid #ffeaa7; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 20px 0; 
          }
          .footer { 
            background: #343a40; 
            color: #ffffff; 
            text-align: center; 
            padding: 20px; 
            font-size: 14px; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 ${type === 'signup' ? 'Email Verification' : 'Password Recovery'}</h1>
            <p>TecBunny Store - Secure Account Management</p>
          </div>
          
          <div class="content">
            <h2>Hello!</h2>
            <p>${type === 'signup' 
              ? 'Thank you for creating your TecBunny Store account! Please use the verification code below to complete your registration:' 
              : 'We received a request to reset your password. Use the code below to proceed:'
            }</p>
            
            <div class="otp-section">
              <p style="margin: 0 0 10px 0; font-size: 18px; color: #666;">Your verification code:</p>
              <div class="otp-code">${otp}</div>
              <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">
                Enter this code to ${type === 'signup' ? 'verify your email' : 'reset your password'}
              </p>
            </div>
            
            <div class="warning-box">
              <h3 style="color: #856404; margin-top: 0;">⚠️ Important Security Information:</h3>
              <ul style="color: #856404; margin: 10px 0;">
                <li><strong>This code expires in 15 minutes</strong></li>
                <li>Never share this code with anyone</li>
                <li>TecBunny staff will never ask for this code</li>
                <li>If you didn't request this, please ignore this email</li>
              </ul>
            </div>
            
            <p>Having trouble? Contact our support team at support@tecbunny.com</p>
            
            <p style="margin-top: 30px;">
              Best regards,<br>
              <strong>TecBunny Store Team</strong>
            </p>
          </div>
          
          <div class="footer">
            <p>This is an automated security email from TecBunny Store.</p>
            <p>Please do not reply to this email.</p>
            <p>&copy; 2025 TecBunny Store. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject,
      html,
      text: `Your ${type === 'signup' ? 'verification' : 'password recovery'} code is: ${otp}. This code expires in 15 minutes.`
    });
  }

  async sendTestEmail(
    email: string,
    subject: string,
    message: string
  ): Promise<EmailResult> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #667eea; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f8f9fa; }
          .footer { background: #343a40; color: white; text-align: center; padding: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Test Email from TecBunny Store</h1>
          </div>
          <div class="content">
            <h2>${subject}</h2>
            <p>${message}</p>
            <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          </div>
          <div class="footer">
            <p>This is a test email from TecBunny Store Enhanced Email Service</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject,
      html,
      text: `${subject}\n\n${message}\n\nTimestamp: ${new Date().toISOString()}`
    });
  }

  // Clean up old rate limit entries periodically
  cleanupRateLimiter() {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    for (const [email, data] of this.rateLimiter.entries()) {
      if (now - data.firstSentAt > oneDay) {
        this.rateLimiter.delete(email);
      }
    }
  }

  // Get rate limit info for an email
  getRateLimitInfo(email: string): {
    count: number;
    canSend: boolean;
    waitTime?: number;
    nextAvailable?: Date;
  } {
    const rateLimitCheck = this.checkRateLimit(email);
    const userLimit = this.rateLimiter.get(email);
    
    return {
      count: userLimit?.count || 0,
      canSend: rateLimitCheck.allowed,
      waitTime: rateLimitCheck.waitTime,
      nextAvailable: rateLimitCheck.waitTime 
        ? new Date(Date.now() + (rateLimitCheck.waitTime * 1000))
        : undefined
    };
  }
}

// Export singleton instance
const improvedEmailService = new ImprovedEmailService();

// Clean up rate limiter every hour
setInterval(() => {
  improvedEmailService.cleanupRateLimiter();
}, 60 * 60 * 1000);

export default improvedEmailService;
