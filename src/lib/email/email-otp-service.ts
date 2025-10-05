import nodemailer from 'nodemailer';

import { logger } from '../logger';

export interface EmailOTPConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from?: string;
  replyTo?: string;
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: string;
}

/**
 * Email OTP Service using Nodemailer
 * Handles email delivery for OTP verification with beautiful templates
 */
export class EmailOTPService {
  private transporter!: nodemailer.Transporter;
  private config: EmailOTPConfig;

  constructor(config?: Partial<EmailOTPConfig>) {
    this.config = {
      host: config?.host || process.env.SMTP_HOST || 'smtp.gmail.com',
      port: config?.port || parseInt(process.env.SMTP_PORT || '587'),
      secure: config?.secure || false, // true for 465, false for other ports
      auth: {
        user: config?.auth?.user || process.env.SMTP_USER!,
        pass: config?.auth?.pass || process.env.SMTP_PASS!
      },
      from: config?.from || process.env.SMTP_FROM || 'noreply@tecbunny.com',
      replyTo: config?.replyTo || process.env.SMTP_REPLY_TO
    };

    if (!this.config.auth.user || !this.config.auth.pass) {
      throw new Error('SMTP credentials are required');
    }

    this.createTransporter();
  }

  /**
   * Create and configure nodemailer transporter
   */
  private createTransporter(): void {
    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: this.config.auth,
      tls: {
        rejectUnauthorized: false // For development - set to true in production
      }
    });
  }

  /**
   * Verify SMTP connection
   */
  async verifyConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.transporter.verify();
      return { success: true };
    } catch (error) {
      logger.error('SMTP verification failed', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'SMTP verification failed'
      };
    }
  }

  /**
   * Send OTP via email with beautiful template
   */
  async sendOTP(email: string, code: string, purpose: string = 'verification', userName?: string): Promise<EmailResponse> {
    try {
      const purposeText = this.getPurposeText(purpose);
      const subject = `Your ${purposeText.toUpperCase()} Code - Tecbunny Solutions`;
      
      // Generate HTML content
      const htmlContent = this.generateOTPEmailHTML(code, purposeText, userName);
      const textContent = this.generateOTPEmailText(code, purposeText, userName);

      const mailOptions = {
        from: {
          name: 'Tecbunny Solutions',
          address: this.config.from!
        },
        to: email,
        subject,
        text: textContent,
        html: htmlContent,
        replyTo: this.config.replyTo,
        headers: {
          'X-Priority': '1', // High priority for OTP emails
          'X-MSMail-Priority': 'High',
          'Importance': 'high'
        }
      };

      logger.info('Sending email OTP', { email, purpose, subject });

      const result = await this.transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: result.messageId,
        provider: 'nodemailer'
      };

    } catch (error) {
      logger.error('Email OTP sending failed', { error, email, purpose });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Email sending failed',
        provider: 'nodemailer'
      };
    }
  }

  /**
   * Send welcome email with OTP
   */
  async sendWelcomeEmailWithOTP(email: string, code: string, userName: string): Promise<EmailResponse> {
    try {
      const subject = 'Welcome to Tecbunny Solutions - Verify Your Account';
      const htmlContent = this.generateWelcomeEmailHTML(code, userName);
      const textContent = this.generateWelcomeEmailText(code, userName);

      const mailOptions = {
        from: {
          name: 'Tecbunny Solutions',
          address: this.config.from!
        },
        to: email,
        subject,
        text: textContent,
        html: htmlContent,
        replyTo: this.config.replyTo
      };

      const result = await this.transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: result.messageId,
        provider: 'nodemailer'
      };

    } catch (error) {
      logger.error('Welcome email sending failed', { error, email });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Welcome email sending failed',
        provider: 'nodemailer'
      };
    }
  }

  /**
   * Send password reset email with OTP
   */
  async sendPasswordResetOTP(email: string, code: string, userName?: string): Promise<EmailResponse> {
    try {
      const subject = 'Password Reset Request - Tecbunny Solutions';
      const htmlContent = this.generatePasswordResetEmailHTML(code, userName);
      const textContent = this.generatePasswordResetEmailText(code, userName);

      const mailOptions = {
        from: {
          name: 'Tecbunny Solutions',
          address: this.config.from!
        },
        to: email,
        subject,
        text: textContent,
        html: htmlContent,
        replyTo: this.config.replyTo,
        headers: {
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'Importance': 'high'
        }
      };

      const result = await this.transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: result.messageId,
        provider: 'nodemailer'
      };

    } catch (error) {
      logger.error('Password reset email sending failed', { error, email });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Password reset email sending failed',
        provider: 'nodemailer'
      };
    }
  }

  /**
   * Send bulk emails
   */
  async sendBulkEmails(recipients: string[], subject: string, content: string, isHTML: boolean = true): Promise<{
    success: boolean;
    results: Array<{ email: string; success: boolean; messageId?: string; error?: string }>;
  }> {
    const results = [];

    for (const email of recipients) {
      try {
        const mailOptions = {
          from: {
            name: 'Tecbunny Solutions',
            address: this.config.from!
          },
          to: email,
          subject,
          [isHTML ? 'html' : 'text']: content,
          replyTo: this.config.replyTo
        };

        const result = await this.transporter.sendMail(mailOptions);
        
        results.push({
          email,
          success: true,
          messageId: result.messageId
        });
      } catch (error) {
        results.push({
          email,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    
    return {
      success: successCount > 0,
      results
    };
  }

  /**
   * Generate beautiful HTML email template for OTP
   */
  private generateOTPEmailHTML(code: string, purpose: string, userName?: string): string {
    const greeting = userName ? `Hi ${userName},` : 'Hello,';
    
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verification Code</title>
        <style>
            body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                line-height: 1.6; 
                color: #333; 
                max-width: 600px; 
                margin: 0 auto; 
                padding: 20px;
                background-color: #f8f9fa;
            }
            .container {
                background: white;
                border-radius: 10px;
                padding: 40px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
            }
            .logo {
                font-size: 28px;
                font-weight: bold;
                color: #007bff;
                margin-bottom: 10px;
            }
            .otp-container {
                background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
                color: white;
                padding: 30px;
                text-align: center;
                border-radius: 10px;
                margin: 30px 0;
            }
            .otp-code {
                font-size: 42px;
                font-weight: bold;
                letter-spacing: 8px;
                margin: 20px 0;
                font-family: 'Courier New', monospace;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            }
            .otp-label {
                font-size: 16px;
                opacity: 0.9;
                margin-bottom: 10px;
            }
            .warning {
                background-color: #fff3cd;
                border: 1px solid #ffeaa7;
                color: #856404;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
            }
            .footer {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                text-align: center;
                color: #666;
                font-size: 14px;
            }
            .security-tips {
                background-color: #e8f4f8;
                border-left: 4px solid #007bff;
                padding: 15px;
                margin: 20px 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🔧 Tecbunny Solutions</div>
                <p style="margin: 0; color: #666;">Your Trusted Technology Partner</p>
            </div>

            <h2 style="color: #333; margin-bottom: 20px;">${greeting}</h2>
            
            <p>You've requested a verification code for <strong>${purpose}</strong>. Please use the code below to complete your request:</p>

            <div class="otp-container">
                <div class="otp-label">Your Verification Code</div>
                <div class="otp-code">${code}</div>
                <div style="font-size: 14px; opacity: 0.8;">Valid for 5 minutes</div>
            </div>

            <div class="security-tips">
                <strong>🔒 Security Tips:</strong>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>This code is valid for 5 minutes only</li>
                    <li>Never share this code with anyone</li>
                    <li>Tecbunny Solutions will never ask for this code via phone or email</li>
                </ul>
            </div>

            <div class="warning">
                <strong>⚠️ Important:</strong> If you didn't request this verification code, please ignore this email and ensure your account is secure.
            </div>

            <div class="footer">
                <p><strong>Need Help?</strong></p>
                <p>Contact us at <a href="mailto:support@tecbunnysolutions.com">support@tecbunnysolutions.com</a></p>
                <p>or call us at <a href="tel:+919429694995">+91 94296 94995</a></p>
                <hr style="margin: 20px 0;">
                <p style="font-size: 12px;">
                    This is an automated message from Tecbunny Solutions.<br>
                    Please do not reply to this email.
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Generate plain text email for OTP
   */
  private generateOTPEmailText(code: string, purpose: string, userName?: string): string {
    const greeting = userName ? `Hi ${userName},` : 'Hello,';
    
    return `
${greeting}

You've requested a verification code for ${purpose}.

Your Verification Code: ${code}

This code is valid for 5 minutes. Please do not share this code with anyone.

Security Tips:
- This code expires in 5 minutes
- Never share this code with anyone
- Tecbunny Solutions will never ask for this code via phone or email

If you didn't request this verification code, please ignore this email.

Need Help?
Contact us at support@tecbunnysolutions.com or call +91 94296 94995

---
Tecbunny Solutions
Your Trusted Technology Partner

This is an automated message. Please do not reply to this email.
    `;
  }

  /**
   * Generate welcome email HTML
   */
  private generateWelcomeEmailHTML(code: string, userName: string): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Tecbunny Solutions</title>
        <style>
            body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                line-height: 1.6; 
                color: #333; 
                max-width: 600px; 
                margin: 0 auto; 
                padding: 20px;
                background-color: #f8f9fa;
            }
            .container {
                background: white;
                border-radius: 10px;
                padding: 40px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
            }
            .logo {
                font-size: 32px;
                font-weight: bold;
                color: #007bff;
                margin-bottom: 10px;
            }
            .welcome-banner {
                background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                color: white;
                padding: 30px;
                text-align: center;
                border-radius: 10px;
                margin: 30px 0;
            }
            .otp-code {
                font-size: 36px;
                font-weight: bold;
                letter-spacing: 6px;
                background: rgba(255,255,255,0.2);
                padding: 15px 25px;
                border-radius: 8px;
                margin: 20px 0;
                font-family: 'Courier New', monospace;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🔧 Tecbunny Solutions</div>
                <p style="margin: 0; color: #666;">Your Trusted Technology Partner</p>
            </div>

            <div class="welcome-banner">
                <h1 style="margin: 0; font-size: 28px;">Welcome, ${userName}! 🎉</h1>
                <p style="margin: 15px 0; opacity: 0.9;">Thank you for joining Tecbunny Solutions family</p>
                <div class="otp-code">${code}</div>
                <p style="margin: 0; font-size: 14px;">Use this code to verify your account</p>
            </div>

            <h3>What's Next?</h3>
            <ul>
                <li>✅ Verify your email with the code above</li>
                <li>🛍️ Explore our products and services</li>
                <li>📞 Contact us for personalized solutions</li>
                <li>🎯 Enjoy exclusive member benefits</li>
            </ul>

            <div style="background-color: #e8f4f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h4 style="margin-top: 0;">🔒 Verification Required</h4>
                <p>Please verify your email address using the code above to activate your account and access all features.</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <p><strong>Need Help Getting Started?</strong></p>
                <p>Our team is here to help you every step of the way!</p>
                <p>📧 <a href="mailto:support@tecbunnysolutions.com">support@tecbunnysolutions.com</a></p>
                <p>📱 <a href="tel:+919429694995">+91 94296 94995</a></p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Generate welcome email text
   */
  private generateWelcomeEmailText(code: string, userName: string): string {
    return `
Welcome to Tecbunny Solutions, ${userName}!

Thank you for joining our family. To complete your registration, please verify your email address with the code below:

Verification Code: ${code}

This code is valid for 5 minutes.

What's Next?
✅ Verify your email with the code above
🛍️ Explore our products and services  
📞 Contact us for personalized solutions
🎯 Enjoy exclusive member benefits

Need Help?
Contact us at support@tecbunnysolutions.com or call +91 94296 94995

---
Welcome aboard!
Tecbunny Solutions Team
    `;
  }

  /**
   * Generate password reset email HTML
   */
  private generatePasswordResetEmailHTML(code: string, userName?: string): string {
    const greeting = userName ? `Hi ${userName},` : 'Hello,';
    
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset Request</title>
        <style>
            body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                line-height: 1.6; 
                color: #333; 
                max-width: 600px; 
                margin: 0 auto; 
                padding: 20px;
                background-color: #f8f9fa;
            }
            .container {
                background: white;
                border-radius: 10px;
                padding: 40px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .alert-banner {
                background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
                color: white;
                padding: 25px;
                text-align: center;
                border-radius: 8px;
                margin: 20px 0;
            }
            .otp-code {
                font-size: 36px;
                font-weight: bold;
                letter-spacing: 6px;
                background: rgba(255,255,255,0.2);
                padding: 15px 25px;
                border-radius: 8px;
                margin: 20px 0;
                font-family: 'Courier New', monospace;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div style="text-align: center; margin-bottom: 30px;">
                <div style="font-size: 28px; font-weight: bold; color: #007bff;">🔧 Tecbunny Solutions</div>
            </div>

            <h2>${greeting}</h2>
            
            <p>We received a request to reset your password. If this was you, use the verification code below:</p>

            <div class="alert-banner">
                <h3 style="margin: 0; font-size: 20px;">🔐 Password Reset Code</h3>
                <div class="otp-code">${code}</div>
                <p style="margin: 0; font-size: 14px;">Valid for 5 minutes only</p>
            </div>

            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <strong>⚠️ Security Notice:</strong>
                <p style="margin: 10px 0;">If you didn't request a password reset, please ignore this email and consider securing your account.</p>
            </div>

            <h4>What to do next:</h4>
            <ol>
                <li>Return to the password reset page</li>
                <li>Enter the verification code: <strong>${code}</strong></li>
                <li>Create your new secure password</li>
            </ol>

            <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
                <p><strong>Need Help?</strong></p>
                <p>Contact our support team</p>
                <p>📧 <a href="mailto:support@tecbunnysolutions.com">support@tecbunnysolutions.com</a></p>
                <p>📱 <a href="tel:+919429694995">+91 94296 94995</a></p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Generate password reset email text
   */
  private generatePasswordResetEmailText(code: string, userName?: string): string {
    const greeting = userName ? `Hi ${userName},` : 'Hello,';
    
    return `
${greeting}

We received a request to reset your password for your Tecbunny Solutions account.

Password Reset Code: ${code}

This code is valid for 5 minutes only.

What to do next:
1. Return to the password reset page
2. Enter the verification code: ${code}
3. Create your new secure password

SECURITY NOTICE: If you didn't request a password reset, please ignore this email and consider securing your account.

Need Help?
Contact us at support@tecbunnysolutions.com or call +91 94296 94995

---
Tecbunny Solutions Security Team

This is an automated message. Please do not reply to this email.
    `;
  }

  /**
   * Get user-friendly purpose text
   */
  private getPurposeText(purpose: string): string {
    const purposeMap: Record<string, string> = {
      'login': 'login verification',
      'registration': 'account registration',
      'password_reset': 'password reset',
      'transaction': 'transaction verification',
      'agent_order': 'order verification'
    };

    return purposeMap[purpose] || 'verification';
  }

  /**
   * Test email configuration
   */
  async testConfiguration(): Promise<{ success: boolean; error?: string }> {
    try {
      const testResult = await this.verifyConnection();
      if (!testResult.success) {
        return testResult;
      }

      // Send test email to configured sender
      const testEmail = await this.sendOTP(
        this.config.auth.user,
        '123456',
        'configuration test',
        'Test User'
      );

      return {
        success: testEmail.success,
        error: testEmail.error
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Configuration test failed'
      };
    }
  }
}

// Export singleton instance
export const emailOTPService = new EmailOTPService();
