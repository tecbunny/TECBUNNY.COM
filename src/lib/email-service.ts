// DEPRECATED: This legacy email service is kept for backward compatibility.
// Use improved-email-service instead. This file now proxies to the improved service
// while retaining the same exported default symbol (nodemailerEmailService).
import nodemailer from 'nodemailer';

import improvedEmailService from './improved-email-service';
import { logger } from './logger';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class NodemailerEmailService {
  private transporter: nodemailer.Transporter;
  private config: {
    from: string;
  };
  private rateLimiter: Map<string, { count: number; firstSentAt: number; lastSentAt: number }> = new Map();
  private lastSendTime: number = 0;

  constructor() {
    this.config = {
      from: process.env.SMTP_FROM || 'noreply@tecbunny.com',
    };

    // Validate SMTP configuration
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      logger.warn('SMTP credentials not configured properly');
    }

    // Create Nodemailer transporter
    this.transporter = nodemailer.createTransport({
      host: (process.env.SMTP_HOST || 'smtp.gmail.com').trim().replace(/[\r\n]/g, ''),
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false
      },
      debug: process.env.NODE_ENV === 'development',
      logger: process.env.NODE_ENV === 'development'
    });

    // Verify connection on startup
    this.verifyConnection();
  }

  private async verifyConnection() {
    try {
      await this.transporter.verify();
      logger.info('SMTP connection verified successfully');
    } catch (error) {
      logger.error('SMTP connection failed', { error });
    }
  }

  private checkRateLimit(email: string): { allowed: boolean; message?: string } {
    const now = Date.now();
  const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
    
    // Global rate limiting: max 1 email per second
    if (now - this.lastSendTime < 1000) {
      return { allowed: false, message: 'Rate limit: Please wait before sending another email' };
    }
    
    const userLimit = this.rateLimiter.get(email);
    
    if (!userLimit) {
      // First email for this user
      this.rateLimiter.set(email, { count: 1, firstSentAt: now, lastSentAt: now });
      return { allowed: true };
    }
    
    // Check if it's been more than an hour since the first email
    if (now - userLimit.firstSentAt > oneHour) {
      // Reset the counter
      this.rateLimiter.set(email, { count: 1, firstSentAt: now, lastSentAt: now });
      return { allowed: true };
    }
    
    // Check if user has exceeded limit (5 emails per hour)
    if (userLimit.count >= 5) {
      return { allowed: false, message: 'Rate limit: Maximum 5 emails per hour reached' };
    }
    
    // Check minimum time between emails (30 seconds)
    if (now - userLimit.lastSentAt < 30000) {
      return { allowed: false, message: 'Rate limit: Please wait 30 seconds between emails' };
    }
    
    // Update the counter
    userLimit.count++;
    userLimit.lastSentAt = now;
    this.rateLimiter.set(email, userLimit);
    
    return { allowed: true };
  }

  async sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Check rate limiting
      const rateLimitCheck = this.checkRateLimit(options.to);
      if (!rateLimitCheck.allowed) {
        return { success: false, error: rateLimitCheck.message || 'Rate limit exceeded' };
      }

      const mailOptions = {
        from: this.config.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      };

      logger.info('Sending email', { to: options.to, subject: options.subject, context: 'EmailService.send' });

      const result = await this.transporter.sendMail(mailOptions);
      
      // Update global rate limiter
      this.lastSendTime = Date.now();
      
      logger.info('Email sent successfully', { to: options.to, subject: options.subject, messageId: result.messageId });
      return { success: true, messageId: result.messageId };
    } catch (error) {
      logger.error('Failed to send email', { to: options.to, subject: options.subject, error });
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  async sendOTPEmail(email: string, otp: string, userName?: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const subject = 'Your OTP Verification Code';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>OTP Verification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .otp-code { background: #fff; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
          .otp-number { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 OTP Verification</h1>
          </div>
          <div class="content">
            <p>Hello${userName ? ` ${userName}` : ''},</p>
            <p>You have requested an OTP verification code. Please use the code below to complete your verification:</p>
            
            <div class="otp-code">
              <div class="otp-number">${otp}</div>
              <p style="margin: 10px 0 0 0; color: #666;">Enter this code to verify your account</p>
            </div>
            
            <p><strong>Important:</strong></p>
            <ul>
              <li>This code is valid for 10 minutes only</li>
              <li>Do not share this code with anyone</li>
              <li>If you didn't request this code, please ignore this email</li>
            </ul>
            
            <p>If you're having trouble, please contact our support team.</p>
            
            <p>Best regards,<br>TecBunny Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({ to: email, subject, html });
  }

  async sendPasswordResetEmail(email: string, resetCode: string, userName?: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const subject = 'Password Reset Request';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .reset-code { background: #fff; border: 2px dashed #ff6b6b; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
          .reset-number { font-size: 32px; font-weight: bold; color: #ff6b6b; letter-spacing: 5px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔑 Password Reset</h1>
          </div>
          <div class="content">
            <p>Hello${userName ? ` ${userName}` : ''},</p>
            <p>You have requested to reset your password. Please use the code below to proceed with your password reset:</p>
            
            <div class="reset-code">
              <div class="reset-number">${resetCode}</div>
              <p style="margin: 10px 0 0 0; color: #666;">Enter this code to reset your password</p>
            </div>
            
            <p><strong>Important:</strong></p>
            <ul>
              <li>This code is valid for 15 minutes only</li>
              <li>Do not share this code with anyone</li>
              <li>If you didn't request this reset, please ignore this email</li>
            </ul>
            
            <p>If you're having trouble, please contact our support team.</p>
            
            <p>Best regards,<br>TecBunny Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({ to: email, subject, html });
  }
}

// If existing code imports default, provide improved service instead.
const nodemailerEmailService = improvedEmailService as unknown as NodemailerEmailService;
export default nodemailerEmailService;
