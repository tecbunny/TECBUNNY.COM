import { WhatsAppService } from './whatsapp-service';
import { logger } from './logger';

export interface OrderNotification {
  orderId: string;
  customerName: string;
  customerPhone: string;
  orderTotal: number;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  orderDate: string;
  expectedDelivery?: string;
}

export interface ServiceNotification {
  serviceId: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  technicianName?: string;
  appointmentDate?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

export interface PaymentNotification {
  paymentId: string;
  customerName: string;
  customerPhone: string;
  amount: number;
  orderId?: string;
  paymentMethod: string;
  transactionDate: string;
}

export interface SecurityAlert {
  userId: string;
  customerName: string;
  customerPhone: string;
  alertType: 'login' | 'password_change' | 'suspicious_activity' | 'account_locked';
  timestamp: string;
  details?: string;
}

/**
 * Enhanced WhatsApp Business API Service for TecBunny Transactional Notifications
 * Handles order updates, service notifications, payment confirmations, and security alerts
 */
const SUPPORT_PHONE = process.env.NEXT_PUBLIC_SUPPORT_PHONE || '+91 96041 36010';

export class WhatsAppNotificationService {
  private whatsAppService: WhatsAppService;

  constructor() {
    this.whatsAppService = new WhatsAppService();
  }

  protected async sendMessage(to: string, message: string, type: 'text' | 'template' = 'text'): Promise<any> {
    return this.whatsAppService.sendMessage(to, message, type);
  }
  
  /**
   * Send enhanced order confirmation notification
   */
  async sendEnhancedOrderConfirmation(notification: OrderNotification): Promise<boolean> {
    try {
      const message = this.createOrderConfirmationMessage(notification);
      await this.sendMessage(notification.customerPhone, message, 'text');
      
      logger.info('Order confirmation WhatsApp sent', {
        orderId: notification.orderId,
        customerPhone: notification.customerPhone
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to send order confirmation WhatsApp', {
        orderId: notification.orderId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Send order status update
   */
  async sendOrderStatusUpdate(
    orderId: string,
    customerPhone: string,
    customerName: string,
    status: 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled',
    trackingNumber?: string,
    estimatedDelivery?: string
  ): Promise<boolean> {
    try {
      const message = this.createOrderStatusMessage(
        orderId, 
        customerName, 
        status, 
        trackingNumber, 
        estimatedDelivery
      );
      
      await this.sendMessage(customerPhone, message, 'text');
      
      logger.info('Order status WhatsApp sent', {
        orderId,
        customerPhone,
        status
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to send order status WhatsApp', {
        orderId,
        status,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Send service request update
   */
  async sendServiceUpdate(notification: ServiceNotification): Promise<boolean> {
    try {
      const message = this.createServiceUpdateMessage(notification);
      await this.sendMessage(notification.customerPhone, message, 'text');
      
      logger.info('Service update WhatsApp sent', {
        serviceId: notification.serviceId,
        customerPhone: notification.customerPhone,
        status: notification.status
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to send service update WhatsApp', {
        serviceId: notification.serviceId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Send payment confirmation
   */
  async sendPaymentConfirmation(notification: PaymentNotification): Promise<boolean> {
    try {
      const message = this.createPaymentConfirmationMessage(notification);
      // Use the internal sendMessage helper (which delegates to the composed service)
      await this.sendMessage(notification.customerPhone, message, 'text');
      
      logger.info('Payment confirmation WhatsApp sent', {
        paymentId: notification.paymentId,
        customerPhone: notification.customerPhone
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to send payment confirmation WhatsApp', {
        paymentId: notification.paymentId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Send security alert
   */
  async sendSecurityAlert(alert: SecurityAlert): Promise<boolean> {
    try {
      const message = this.createSecurityAlertMessage(alert);
      await this.sendMessage(alert.customerPhone, message, 'text');
      
      logger.info('Security alert WhatsApp sent', {
        userId: alert.userId,
        customerPhone: alert.customerPhone,
        alertType: alert.alertType
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to send security alert WhatsApp', {
        userId: alert.userId,
        alertType: alert.alertType,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Create order confirmation message
   */
  private createOrderConfirmationMessage(notification: OrderNotification): string {
    const itemsList = notification.items
      .map(item => `• ${item.name} (Qty: ${item.quantity}) - ₹${item.price}`)
      .join('\n');

    return `🎉 *TecBunny Solutions - Order Confirmed*

Hello ${notification.customerName}! 

Your order has been successfully placed.

📋 *Order Details:*
Order ID: ${notification.orderId}
Order Date: ${notification.orderDate}
Total Amount: ₹${notification.orderTotal}

🛍️ *Items Ordered:*
${itemsList}

${notification.expectedDelivery ? `📅 *Expected Delivery:* ${notification.expectedDelivery}` : ''}

📞 For any queries, contact us at: +91 96041 36010

Thank you for choosing TecBunny Solutions! 🚀`;
  }

  /**
   * Create order status update message
   */
  private createOrderStatusMessage(
    orderId: string,
    customerName: string,
    status: string,
    trackingNumber?: string,
    estimatedDelivery?: string
  ): string {
    const statusEmoji = {
      confirmed: '✅',
      processing: '⚙️',
      shipped: '🚚',
      delivered: '📦',
      cancelled: '❌'
    };

    const statusText = {
      confirmed: 'Confirmed and being prepared',
      processing: 'Being processed',
      shipped: 'Shipped and on the way',
      delivered: 'Successfully delivered',
      cancelled: 'Cancelled'
    };

    let message = `${statusEmoji[status as keyof typeof statusEmoji]} *TecBunny Solutions - Order Update*

Hello ${customerName}!

Your order ${orderId} has been ${statusText[status as keyof typeof statusText]}.`;

    if (trackingNumber) {
      message += `\n\n📦 *Tracking Number:* ${trackingNumber}`;
    }

    if (estimatedDelivery) {
      message += `\n📅 *Estimated Delivery:* ${estimatedDelivery}`;
    }

    message += `\n\n📞 For any queries, contact us at: +91 96041 36010`;

    return message;
  }

  /**
   * Create service update message
   */
  private createServiceUpdateMessage(notification: ServiceNotification): string {
    const statusEmoji = {
      scheduled: '📅',
      in_progress: '🔧',
      completed: '✅',
      cancelled: '❌'
    };

    const statusText = {
      scheduled: 'Scheduled',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled'
    };

    let message = `${statusEmoji[notification.status]} *TecBunny Solutions - Service Update*

Hello ${notification.customerName}!

Your service request has been ${statusText[notification.status]}.

🔧 *Service Details:*
Service ID: ${notification.serviceId}
Service: ${notification.serviceName}`;

    if (notification.technicianName) {
      message += `\nTechnician: ${notification.technicianName}`;
    }

    if (notification.appointmentDate) {
      message += `\nAppointment: ${notification.appointmentDate}`;
    }

    message += `\n\n📞 For any queries, contact us at: +91 96041 36010`;

    return message;
  }

  /**
   * Create payment confirmation message
   */
  private createPaymentConfirmationMessage(notification: PaymentNotification): string {
    return `💳 *TecBunny Solutions - Payment Received*

Hello ${notification.customerName}!

Your payment has been successfully processed.

💰 *Payment Details:*
Payment ID: ${notification.paymentId}
Amount: ₹${notification.amount}
Payment Method: ${notification.paymentMethod}
Transaction Date: ${notification.transactionDate}
${notification.orderId ? `Order ID: ${notification.orderId}` : ''}

✅ *Payment Status:* Confirmed

📞 For any queries, contact us at: +91 96041 36010

Thank you for your business! 🙏`;
  }

  /**
   * Create security alert message
   */
  private createSecurityAlertMessage(alert: SecurityAlert): string {
    const alertEmoji = {
      login: '🔐',
      password_change: '🔑',
      suspicious_activity: '⚠️',
      account_locked: '🔒'
    };

    const alertText = {
      login: 'New login detected',
      password_change: 'Password changed',
      suspicious_activity: 'Suspicious activity detected',
      account_locked: 'Account locked for security'
    };

    let message = `${alertEmoji[alert.alertType]} *TecBunny Solutions - Security Alert*

Hello ${alert.customerName}!

${alertText[alert.alertType]} on your account.

🔐 *Security Details:*
Alert Type: ${alertText[alert.alertType]}
Time: ${alert.timestamp}`;

    if (alert.details) {
      message += `\nDetails: ${alert.details}`;
    }

    message += `\n\n⚠️ If this wasn't you, please contact us immediately at: +91 96041 36010

🔒 Your account security is our priority.`;

    return message;
  }

  /**
   * Bulk send notifications (for order updates, etc.)
   */
  async sendBulkNotifications(
    notifications: Array<{
      phone: string;
      message: string;
      type: string;
    }>
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Process in batches to avoid rate limiting
    const batchSize = 5;
    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize);
      
      const promises = batch.map(async (notification) => {
        try {
          await this.sendMessage(notification.phone, notification.message, 'text');
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push(
            `Failed to send to ${notification.phone}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      });

      await Promise.all(promises);
      
      // Add delay between batches
      if (i + batchSize < notifications.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    logger.info('Bulk WhatsApp notifications completed', results);
    return results;
  }
}

// Export singleton instance
export const whatsAppNotificationService = new WhatsAppNotificationService();
export default whatsAppNotificationService;