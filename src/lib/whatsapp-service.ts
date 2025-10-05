import { logger } from './logger';

// WhatsApp Business API service for TecBunny
export class WhatsAppService {
  private baseUrl: string;
  private accessToken: string;
  private phoneNumberId: string;

  constructor() {
    this.baseUrl = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0';
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
  }

  // Send WhatsApp notification
  async sendMessage(to: string, message: string, messageType: 'text' | 'template' = 'text') {
    try {
      // Clean phone number (remove +, spaces, etc.)
      const cleanNumber = to.replace(/[^\d]/g, '');
      const formattedNumber = cleanNumber.startsWith('91') ? cleanNumber : `91${cleanNumber}`;

      const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;
      
      const payload = {
        messaging_product: 'whatsapp',
        to: formattedNumber,
        type: messageType,
        [messageType]: messageType === 'text' ? { body: message } : message
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(`WhatsApp API error: ${result.error?.message || 'Unknown error'}`);
      }

      logger.info('WhatsApp message sent successfully:', {
        to: formattedNumber,
        messageId: result.messages?.[0]?.id
      });

      return result;
    } catch (error: any) {
      logger.error('Failed to send WhatsApp message:', { error: error.message });
      throw error;
    }
  }

  // Send welcome message template
  async sendWelcomeTemplate(to: string, customerName: string) {
    const templateMessage = {
      name: 'tecbunny_welcome',
      language: { code: 'en' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: customerName }
          ]
        }
      ]
    };

    return this.sendMessage(to, JSON.stringify(templateMessage), 'template');
  }

  // Send order confirmation
  async sendOrderConfirmation(to: string, orderData: {
    orderNumber: string;
    amount: number;
    items: string[];
  }) {
    const message = `
🎉 Order Confirmed - TecBunny Store

Order #: ${orderData.orderNumber}
Amount: ₹${orderData.amount.toLocaleString('en-IN')}

Items:
${orderData.items.map(item => `• ${item}`).join('\n')}

📦 We'll process your order within 24 hours
📱 Track your order: https://tecbunny.com/orders/${orderData.orderNumber}

Thank you for choosing TecBunny! 🚀
    `.trim();

    return this.sendMessage(to, message);
  }

  // Send order status update
  async sendOrderUpdate(to: string, orderData: {
    orderNumber: string;
    status: string;
    trackingNumber?: string;
    estimatedDelivery?: string;
  }) {
    let message = `
📦 Order Update - TecBunny Store

Order #: ${orderData.orderNumber}
Status: ${orderData.status}
    `;

    if (orderData.trackingNumber) {
      message += `\nTracking #: ${orderData.trackingNumber}`;
    }

    if (orderData.estimatedDelivery) {
      message += `\nEstimated Delivery: ${orderData.estimatedDelivery}`;
    }

    message += `\n\n📱 Track: https://tecbunny.com/orders/${orderData.orderNumber}`;

    return this.sendMessage(to, message);
  }

  // Send payment reminder
  async sendPaymentReminder(to: string, orderData: {
    orderNumber: string;
    amount: number;
    paymentLink: string;
  }) {
    const message = `
💳 Payment Reminder - TecBunny Store

Order #: ${orderData.orderNumber}
Amount Due: ₹${orderData.amount.toLocaleString('en-IN')}

Please complete your payment to process the order:
${orderData.paymentLink}

Questions? Reply to this message.
    `.trim();

    return this.sendMessage(to, message);
  }

  // Send support message
  async sendSupportMessage(to: string, supportData: {
    ticketNumber: string;
    issue: string;
    response: string;
  }) {
    const message = `
🛠️ Support Update - TecBunny Store

Ticket #: ${supportData.ticketNumber}
Issue: ${supportData.issue}

Response:
${supportData.response}

Need more help? Reply to this message.
    `.trim();

    return this.sendMessage(to, message);
  }

  // Send promotional message
  async sendPromotion(to: string, promoData: {
    title: string;
    description: string;
    discountCode?: string;
    validUntil?: string;
    link: string;
  }) {
    let message = `
🎉 ${promoData.title}

${promoData.description}
    `;

    if (promoData.discountCode) {
      message += `\n\n🎫 Code: ${promoData.discountCode}`;
    }

    if (promoData.validUntil) {
      message += `\n⏰ Valid until: ${promoData.validUntil}`;
    }

    message += `\n\n🛍️ Shop now: ${promoData.link}`;

    return this.sendMessage(to, message);
  }

  // Send cart abandonment reminder
  async sendCartReminder(to: string, cartData: {
    items: string[];
    total: number;
    cartLink: string;
  }) {
    const message = `
🛒 Don't forget your TecBunny cart!

Items waiting for you:
${cartData.items.map(item => `• ${item}`).join('\n')}

Total: ₹${cartData.total.toLocaleString('en-IN')}

Complete your purchase:
${cartData.cartLink}

Need help? Just reply to this message! 💬
    `.trim();

    return this.sendMessage(to, message);
  }
}

// Export singleton instance
const whatsappService = new WhatsAppService();

// Convenience function for quick notifications
export async function sendWhatsAppNotification(to: string, message: string) {
  return whatsappService.sendMessage(to, message);
}

// Specific notification functions
export async function sendOrderNotification(to: string, orderData: any) {
  return whatsappService.sendOrderConfirmation(to, orderData);
}

export async function sendOrderStatusUpdate(to: string, orderData: any) {
  return whatsappService.sendOrderUpdate(to, orderData);
}

export async function sendPaymentReminder(to: string, orderData: any) {
  return whatsappService.sendPaymentReminder(to, orderData);
}

export async function sendSupportNotification(to: string, supportData: any) {
  return whatsappService.sendSupportMessage(to, supportData);
}

export async function sendPromotionalMessage(to: string, promoData: any) {
  return whatsappService.sendPromotion(to, promoData);
}

export async function sendCartAbandonmentReminder(to: string, cartData: any) {
  return whatsappService.sendCartReminder(to, cartData);
}

export default whatsappService;
