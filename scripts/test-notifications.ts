// Quick dry-run harness for email + WhatsApp templates (no external sends)
// Usage: npx ts-node scripts/test-notifications.ts

import nodemailer from 'nodemailer';

import { EmailOTPService } from '../src/lib/email/email-otp-service';
import { WhatsAppNotificationService } from '../src/lib/whatsapp-notification-service';

class DryRunEmailService extends EmailOTPService {
  constructor() {
    super({
      host: 'localhost',
      port: 2525,
      secure: false,
      auth: { user: 'dryrun', pass: 'dryrun' },
      from: 'support@tecbunny.com',
      replyTo: 'support@tecbunny.com',
    });

    // Replace transporter with a JSON transport to avoid real SMTP traffic
    (this as any).transporter = nodemailer.createTransport({ jsonTransport: true });
  }
}

class DryRunWhatsAppService extends WhatsAppNotificationService {
  // Override sendMessage to log payloads instead of calling the API
  async sendMessage(to: string, message: string, messageType: 'text' | 'template' = 'text') {
    console.log('\n[WA DRY-RUN]', { to, messageType, message });
    return { messageId: 'dry-run' } as any;
  }
}

async function main() {
  // Email dry-run
  const emailService = new DryRunEmailService();
  const emailResult = await emailService.sendOTP('demo@example.com', '123456', 'verification', 'Dry Run User');
  console.log('\n[EMAIL DRY-RUN]', emailResult);

  // WhatsApp dry-run
  const waService = new DryRunWhatsAppService();
  await waService.sendEnhancedOrderConfirmation({
    orderId: 'ORDER-123',
    customerName: 'Dry Run User',
    customerPhone: '+91 99999 99999',
    orderTotal: 1999,
    orderDate: new Date().toISOString(),
    items: [
      { name: 'Camera Kit', quantity: 1, price: 1499 },
      { name: 'Install Service', quantity: 1, price: 500 },
    ],
    expectedDelivery: '2026-02-01',
  });

  console.log('\nDry-run complete. No external requests were made.');
}

main().catch((err) => {
  console.error('Dry-run failed', err);
  process.exit(1);
});
