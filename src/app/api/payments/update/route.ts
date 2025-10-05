import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '../../../../lib/supabase/server';
import { sendWhatsAppTemplate } from '../../../../lib/superfone-whatsapp-service';
import { logger } from '../../../../lib/logger';
import { apiError, apiSuccess } from '../../../../lib/errors';
import { rateLimit } from '../../../../lib/rate-limit';

interface PaymentUpdateData {
  order_id: string;
  payment_id?: string;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  amount: number;
  gateway?: string;
  transaction_id?: string;
  failure_reason?: string;
}

// Payment status update with WhatsApp notifications
export async function POST(request: NextRequest) {
  try {
    const correlationId = request.headers.get('x-correlation-id') || null;
    const supabase = await createClient();

    // Rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!rateLimit(clientIP, 'payment_updates', { limit: 10, windowMs: 60000 })) {
      return apiError('RATE_LIMITED', { correlationId });
    }

    const body: PaymentUpdateData = await request.json();
    const { 
      order_id, 
      payment_id, 
      status, 
      amount, 
      gateway = 'unknown',
      transaction_id,
      failure_reason 
    } = body;

    // Validate required fields
    if (!order_id || !status || !amount) {
      return apiError('VALIDATION_ERROR', { 
        correlationId, 
        overrideMessage: 'order_id, status, and amount are required' 
      });
    }

    logger.info('payment_update_attempt', {
      order_id,
      payment_id,
      status,
      amount,
      correlationId
    });

    // Get order details with customer information
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, items')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      logger.error('order_not_found', { order_id, error: orderError, correlationId });
      return apiError('NOT_FOUND', { 
        correlationId, 
        overrideMessage: 'Order not found' 
      });
    }

    // Parse order items to get customer info
  const orderItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
  const customerPhone = orderItems?.customer_phone;

    // Create or update payment record in orders table (if you have payments tracking)
    // For now, we'll update the order status based on payment status
    let newOrderStatus = order.status;
    if (status === 'success') {
      newOrderStatus = 'confirmed';
    } else if (status === 'failed') {
      newOrderStatus = 'payment_failed';
    }

    // Update order status
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({ 
        status: newOrderStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', order_id)
      .select()
      .single();

    if (updateError) {
      logger.error('order_update_error', { order_id, error: updateError, correlationId });
      return apiError('DATABASE_ERROR', { correlationId });
    }

    logger.info('payment_status_updated', { 
      order_id, 
      old_status: order.status, 
      new_status: newOrderStatus,
      payment_status: status,
      correlationId 
    });

    // Send WhatsApp notifications
    if (customerPhone) {
      try {
        // Clean and format phone number
        const cleanPhone = customerPhone.replace(/[^\d+]/g, '');
        const formattedPhone = cleanPhone.startsWith('+') ? cleanPhone : `+91${cleanPhone}`;

  let customerMessage = '';

        switch (status) {
          case 'success':
            customerMessage = `✅ Payment Successful!\n\n` +
              `💰 Amount: ₹${amount}\n` +
              `📋 Order ID: ${order_id}\n` +
              `🎯 Transaction ID: ${transaction_id || 'N/A'}\n` +
              `📦 Your order is now confirmed and being processed!\n` +
              `📅 Date: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;
            break;

          case 'failed':
            customerMessage = `❌ Payment Failed\n\n` +
              `💰 Amount: ₹${amount}\n` +
              `📋 Order ID: ${order_id}\n` +
              `🔍 Reason: ${failure_reason || 'Unknown error'}\n` +
              `🔄 Please try again or contact support.\n` +
              `📅 Date: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;
            break;

          case 'refunded':
            customerMessage = `💸 Refund Processed\n\n` +
              `💰 Amount: ₹${amount}\n` +
              `📋 Order ID: ${order_id}\n` +
              `🏦 Refund will be credited to your account within 5-7 business days.\n` +
              `📅 Date: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;
            break;

          default:
            customerMessage = `📄 Payment Status Update\n\n` +
              `💰 Amount: ₹${amount}\n` +
              `📋 Order ID: ${order_id}\n` +
              `📊 Status: ${status}\n` +
              `📅 Date: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;
        }

        // Send to customer
        await sendWhatsAppTemplate({
          templateName: 'payment_notification',
          language: 'en',
          recipient: formattedPhone,
          components: [
            {
              type: 'text',
              parameters: [
                { type: 'text', text: customerMessage }
              ]
            }
          ]
        });

        logger.info('payment_whatsapp_customer_sent', { 
          order_id, 
          phone: formattedPhone,
          status,
          correlationId 
        });

        // Notify admin about payment status
        const adminPhone = process.env.ADMIN_WHATSAPP_NUMBER;
        if (adminPhone) {
          let adminMessage = `💳 Payment ${status.toUpperCase()}\n\n` +
            `📋 Order ID: ${order_id}\n` +
            `👤 Customer: ${order.customer_name}\n` +
            `📱 Phone: ${formattedPhone}\n` +
            `💰 Amount: ₹${amount}\n` +
            `🏦 Gateway: ${gateway}\n` +
            `🆔 Transaction: ${transaction_id || 'N/A'}\n` +
            `📅 Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;

          if (status === 'failed' && failure_reason) {
            adminMessage += `
❌ Reason: ${failure_reason}`;
          }

          await sendWhatsAppTemplate({
            templateName: 'admin_payment_notification',
            language: 'en',
            recipient: adminPhone,
            components: [
              {
                type: 'text',
                parameters: [
                  { type: 'text', text: adminMessage }
                ]
              }
            ]
          });

          logger.info('payment_whatsapp_admin_sent', { 
            order_id, 
            adminPhone,
            status,
            correlationId 
          });
        }

        // Notify manager if different from admin
        const managerPhone = process.env.MANAGER_WHATSAPP_NUMBER;
        if (managerPhone && managerPhone !== adminPhone) {
          const managerMessage = `💳 Payment ${status.toUpperCase()}\n` +
            `📋 Order: ${order_id}\n` +
            `💰 ₹${amount}\n` +
            `👤 ${order.customer_name}\n` +
            `⏰ ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;

          await sendWhatsAppTemplate({
            templateName: 'manager_payment_notification',
            language: 'en',
            recipient: managerPhone,
            components: [
              {
                type: 'text',
                parameters: [
                  { type: 'text', text: managerMessage }
                ]
              }
            ]
          });

          logger.info('payment_whatsapp_manager_sent', { 
            order_id, 
            managerPhone,
            status,
            correlationId 
          });
        }

      } catch (whatsappError) {
        logger.warn('payment_whatsapp_failure', { 
          order_id, 
          error: whatsappError instanceof Error ? whatsappError.message : 'unknown',
          correlationId 
        });
        // Don't fail the payment update if WhatsApp fails
      }
    }

    return apiSuccess({
      order_id,
      payment_status: status,
      order_status: newOrderStatus,
      amount,
      updated_at: updatedOrder.updated_at
    }, correlationId);

  } catch (error) {
    const correlationId = request.headers.get('x-correlation-id') || null;
    logger.error('payment_update_error', { error, correlationId });
    return apiError('INTERNAL_ERROR', { correlationId });
  }
}

// Get payment status for an order
export async function GET(request: NextRequest) {
  try {
    const correlationId = request.headers.get('x-correlation-id') || null;
    const { searchParams } = new URL(request.url);
    const order_id = searchParams.get('order_id');

    if (!order_id) {
      return apiError('VALIDATION_ERROR', { 
        correlationId, 
        overrideMessage: 'order_id parameter is required' 
      });
    }

    const supabase = await createClient();
    
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, status, total, created_at, updated_at')
      .eq('id', order_id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      logger.error('payment_status_lookup_error', { error, order_id, correlationId });
      return apiError('DATABASE_ERROR', { correlationId });
    }

    if (!order) {
      return NextResponse.json({
        success: false,
        error: 'Order not found',
        order: null
      }, { status: 404 });
    }

    return apiSuccess({
      order_id: order.id,
      status: order.status,
      total: order.total,
      created_at: order.created_at,
      updated_at: order.updated_at
    }, correlationId);

  } catch (error) {
    const correlationId = request.headers.get('x-correlation-id') || null;
    logger.error('payment_status_lookup_error', { error, correlationId });
    return apiError('INTERNAL_ERROR', { correlationId });
  }
}