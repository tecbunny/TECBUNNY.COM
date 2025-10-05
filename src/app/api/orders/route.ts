import { NextRequest } from 'next/server';

import { createClient as createServerClient } from '../../../lib/supabase/server';
import { rateLimit } from '../../../lib/rate-limit';
import { resolveSiteUrl } from '../../../lib/site-url';
import { apiError, apiSuccess } from '../../../lib/errors';
import { logger } from '../../../lib/logger';
import { 
  sendOrderConfirmationTemplate,
  sendWhatsAppTemplate
} from '../../../lib/superfone-whatsapp-service';
import { otpService } from '../../../lib/otp-service';
import { enhancedCommissionService } from '../../../lib/enhanced-commission-service';
const RATE_LIMIT = 5; // 5 orders
const RATE_WINDOW_MS = 60 * 1000; // per minute

export async function POST(request: NextRequest) {
  try {
    const correlationId = request.headers.get('x-correlation-id') || null;
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return apiError('UNAUTHORIZED', { correlationId, overrideMessage: 'Authentication required' });
    }

    // Rate limit by user id
  if (!rateLimit(user.id, 'api_orders_create', { limit: RATE_LIMIT, windowMs: RATE_WINDOW_MS })) {
      logger.warn('orders_rate_limited', { userId: user.id });
      return apiError('RATE_LIMITED', { correlationId });
    }

    const orderData = await request.json();

  logger.info('order_create_attempt', { userId: user.id });

    // Validate required fields
    if (!orderData.customer_name || !orderData.customer_email || !orderData.customer_phone) {
  return apiError('VALIDATION_ERROR', { correlationId, overrideMessage: 'Missing required customer information' });
    }

    // Calculate totals if not provided
    const subtotal = orderData.subtotal || 0;
    const gst_amount = orderData.gst_amount || (subtotal * 0.18);
    const total = orderData.total || (subtotal + gst_amount);

    // Store additional info that doesn't have dedicated columns in the items field
    const orderItemsWithCustomerInfo = {
      cart_items: orderData.items || [],
      customer_email: orderData.customer_email,
      customer_phone: orderData.customer_phone,
      delivery_address: orderData.delivery_address,
      payment_method: orderData.payment_method,
      customer_notes: orderData.notes,
      agent_id: orderData.agent_id || null, // Store agent info if this is an agent order
      otp_required: !!orderData.agent_id // Flag for OTP requirement
    };

    // Only insert fields that exist in the database schema
    // Available fields: id, customer_name, customer_id, status, subtotal, gst_amount, total, type, items, processed_by, created_at
    const orderToInsert = {
      customer_name: orderData.customer_name,
      customer_id: orderData.customer_id || null,
      status: orderData.status || 'pending',
      subtotal: Math.round(subtotal * 100) / 100,
      gst_amount: Math.round(gst_amount * 100) / 100,
      total: Math.round(total * 100) / 100,
      type: orderData.type || 'Delivery',
      items: JSON.stringify(orderItemsWithCustomerInfo),
      processed_by: null,
      created_at: new Date().toISOString()
    };

  logger.debug('order_insert_payload', { userId: user.id });

    // Insert order into database
  const { data: createdOrder, error } = await supabase
      .from('orders')
      .insert([orderToInsert])
      .select()
      .single();

    if (error) {
      logger.error('order_create_db_error', { err: error.message, userId: user.id });
      return apiError('INTERNAL_ERROR', { correlationId, overrideMessage: 'Failed to create order', details: { error: error.message } });
    }

    logger.info('order_created', { orderId: createdOrder.id, userId: user.id });

    // Parse the additional info back for the response
    const orderItemsData = JSON.parse(createdOrder.items || '{}');
    const fullOrder = {
      ...createdOrder,
      customer_email: orderItemsData.customer_email,
      customer_phone: orderItemsData.customer_phone,
      delivery_address: orderItemsData.delivery_address,
      payment_method: orderItemsData.payment_method,
      notes: orderItemsData.customer_notes,
      items: orderItemsData.cart_items || []
    };

    // Handle agent commission if this is an agent order
    if (orderData.agent_id) {
      try {
        // Calculate and save commission
        const commissionResult = await enhancedCommissionService.calculateOrderCommission(
          createdOrder.id,
          orderData.agent_id
        );

        if (commissionResult.success && commissionResult.calculation) {
          const saveResult = await enhancedCommissionService.saveCommissionRecord(
            commissionResult.calculation
          );
          
          if (saveResult.success) {
            logger.info('order_commission_processed', { 
              orderId: createdOrder.id, 
              agentId: orderData.agent_id,
              commissionAmount: commissionResult.calculation.commission_amount
            });
          }
        }

        // Generate OTP for agent verification if customer phone is provided
        if (orderItemsData.customer_phone) {
          const otpResult = await otpService.generateOtp({
            order_id: createdOrder.id,
            agent_id: orderData.agent_id,
            customer_phone: orderItemsData.customer_phone,
            otp_type: 'agent_order'
          });

          if (otpResult.success) {
            logger.info('order_otp_generated', { 
              orderId: createdOrder.id, 
              agentId: orderData.agent_id 
            });
          }
        }
      } catch (agentError) {
        logger.warn('order_agent_processing_failure', { 
          orderId: createdOrder.id, 
          agentId: orderData.agent_id,
          error: agentError instanceof Error ? agentError.message : 'unknown' 
        });
        // Don't fail the order creation if agent processing fails
      }
    }

    // Send order confirmation email
    try {
  await fetch(`${resolveSiteUrl(request.headers.get('host') || undefined)}/api/email/order-confirmation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: orderData.customer_email,
          orderData: fullOrder
        }),
      });
    } catch (emailError) {
      logger.warn('order_email_failure', { orderId: createdOrder.id, error: emailError instanceof Error ? emailError.message : 'unknown' });
      // Don't fail the order creation if email fails
    }

    // Send WhatsApp notifications
    try {
      const customerPhone = orderItemsData.customer_phone;
      
      if (customerPhone) {
        // Clean and format phone number
        const cleanPhone = customerPhone.replace(/[^\d+]/g, '');
        const formattedPhone = cleanPhone.startsWith('+') ? cleanPhone : `+91${cleanPhone}`;

        // Send order confirmation to customer
        await sendOrderConfirmationTemplate(
          formattedPhone,
          createdOrder.id.toString(),
          orderData.customer_name
        );

        logger.info('order_whatsapp_customer_sent', { 
          orderId: createdOrder.id, 
          phone: formattedPhone 
        });

        // Notify admin about new order
        const adminPhone = process.env.ADMIN_WHATSAPP_NUMBER;
        if (adminPhone) {
          const itemsList = (orderItemsData.cart_items || [])
            .map((item: any) => `• ${item.name} (₹${item.price} x ${item.quantity})`)
            .join('\n');

          const adminMessage = `🛒 New Order Received!\n\n` +
            `📋 Order ID: ${createdOrder.id}\n` +
            `👤 Customer: ${orderData.customer_name}\n` +
            `📱 Phone: ${formattedPhone}\n` +
            `💰 Total: ₹${fullOrder.total}\n` +
            `📦 Items:\n${itemsList || 'No items listed'}\n` +
            `⏰ Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;

          await sendWhatsAppTemplate({
            templateName: 'admin_notification',
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

          logger.info('order_whatsapp_admin_sent', { 
            orderId: createdOrder.id, 
            adminPhone 
          });
        }

        // Notify manager if different from admin
        const managerPhone = process.env.MANAGER_WHATSAPP_NUMBER;
        if (managerPhone && managerPhone !== adminPhone) {
          const managerMessage = `📋 Order #${createdOrder.id}\n` +
            `👤 ${orderData.customer_name}\n` +
            `💰 ₹${fullOrder.total}\n` +
            `⏰ ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;

          await sendWhatsAppTemplate({
            templateName: 'manager_notification',
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

          logger.info('order_whatsapp_manager_sent', { 
            orderId: createdOrder.id, 
            managerPhone 
          });
        }
      }
    } catch (whatsappError) {
      logger.warn('order_whatsapp_failure', { 
        orderId: createdOrder.id, 
        error: whatsappError instanceof Error ? whatsappError.message : 'unknown' 
      });
      // Don't fail the order creation if WhatsApp fails
    }

    return apiSuccess({ order: fullOrder }, correlationId);

  } catch (error) {
    const correlationId = request.headers.get('x-correlation-id') || null;
    logger.error('order_api_uncaught', { error: error instanceof Error ? error.message : 'unknown' });
    return apiError('INTERNAL_ERROR', { correlationId, details: { error: error instanceof Error ? error.message : 'Unknown error' } });
  }
}