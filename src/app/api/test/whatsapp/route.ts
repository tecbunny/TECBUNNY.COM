import { NextRequest, NextResponse } from 'next/server';

import { whatsAppNotificationService } from '../../../../lib/whatsapp-notification-service';
import { logger } from '../../../../lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, type, data } = body;

    if (!phone || !type || !data) {
      return NextResponse.json(
        { error: 'Phone, type, and data are required' },
        { status: 400 }
      );
    }

    let result = false;
    let message = '';

    switch (type) {
      case 'order_confirmation':
        result = await whatsAppNotificationService.sendEnhancedOrderConfirmation({
          orderId: data.orderId,
          customerName: data.customerName,
          customerPhone: phone,
          orderTotal: data.orderTotal,
          items: data.items,
          orderDate: data.orderDate,
          expectedDelivery: data.expectedDelivery
        });
        message = 'Order confirmation sent';
        break;

      case 'order_status':
        result = await whatsAppNotificationService.sendOrderStatusUpdate(
          data.orderId,
          phone,
          data.customerName,
          data.status,
          data.trackingNumber,
          data.estimatedDelivery
        );
        message = 'Order status update sent';
        break;

      case 'payment_confirmation':
        result = await whatsAppNotificationService.sendPaymentConfirmation({
          paymentId: data.paymentId,
          customerName: data.customerName,
          customerPhone: phone,
          amount: data.amount,
          orderId: data.orderId,
          paymentMethod: data.paymentMethod,
          transactionDate: data.transactionDate
        });
        message = 'Payment confirmation sent';
        break;

      case 'service_update':
        result = await whatsAppNotificationService.sendServiceUpdate({
          serviceId: data.serviceId,
          customerName: data.customerName,
          customerPhone: phone,
          serviceName: data.serviceName,
          technicianName: data.technicianName,
          appointmentDate: data.appointmentDate,
          status: data.status
        });
        message = 'Service update sent';
        break;

      case 'security_alert':
        result = await whatsAppNotificationService.sendSecurityAlert({
          userId: data.userId,
          customerName: data.customerName,
          customerPhone: phone,
          alertType: data.alertType,
          timestamp: data.timestamp,
          details: data.details
        });
        message = 'Security alert sent';
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid notification type' },
          { status: 400 }
        );
    }

    if (result) {
      logger.info('Test WhatsApp notification sent', { type, phone });
      return NextResponse.json({
        success: true,
        message,
        type,
        phone
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to send WhatsApp notification' },
        { status: 500 }
      );
    }

  } catch (error) {
    logger.error('WhatsApp test API error:', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}