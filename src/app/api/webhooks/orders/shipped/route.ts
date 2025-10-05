import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '../../../../../lib/supabase/server';
import { sendWhatsAppNotification } from '../../../../../lib/whatsapp-service';
import { logger } from '../../../../../lib/logger';

// Generic order shipped webhook handler
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    
    logger.info('Order shipped webhook received:', { body: JSON.stringify(body) });

    const signature = request.headers.get('x-webhook-signature');
    const source = request.headers.get('x-webhook-source') || 'unknown';
    
    if (!validateWebhookSignature(signature, body, source)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const result = await processOrderShipped(supabase, body, source);
    await logWebhookEvent(supabase, 'order_shipped', body, source, true);
    
    return NextResponse.json(result);

  } catch (error: any) {
    logger.error('Order shipped webhook error:', { error: error.message });
    
    try {
      const supabase = await createClient();
      await logWebhookEvent(supabase, 'order_shipped', await request.json(), 'unknown', false, error.message);
    } catch (logError: any) {
      logger.error('Failed to log webhook error:', { error: logError.message });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function processOrderShipped(supabase: any, data: any, source: string) {
  const {
    order_id,
    order_number,
    customer_phone,
    customer_name,
    tracking_number,
    carrier,
    courier_name,
    shipping_address,
    estimated_delivery,
    expected_delivery_date,
    tracking_url
  } = data;

  const orderId = order_id || order_number;
  const courierService = carrier || courier_name;

  if (!orderId) {
    throw new Error('Order ID is required');
  }

  const cleanPhone = customer_phone?.replace(/[^\d]/g, '');
  const formattedPhone = cleanPhone ? (cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`) : null;
  const deliveryDate = estimated_delivery || expected_delivery_date;

  // Update order status
  const { error: orderError } = await supabase
    .from('orders')
    .update({
      status: 'shipped',
      tracking_number,
      carrier: courierService,
      shipped_at: new Date().toISOString(),
      estimated_delivery: deliveryDate,
      tracking_url,
      updated_at: new Date().toISOString()
    })
    .eq('order_id', orderId);

  if (orderError) {
    logger.warn('Failed to update order status:', orderError);
  }

  // Find customer and log interaction
  if (formattedPhone) {
    const { data: customer } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', formattedPhone)
      .single();

    if (customer) {
      await supabase
        .from('customer_interactions')
        .insert({
          customer_id: customer.id,
          interaction_type: 'order_shipped',
          direction: 'outbound',
          interaction_data: {
            order_id: orderId,
            tracking_number,
            carrier: courierService,
            estimated_delivery: deliveryDate,
            tracking_url,
            source
          },
          created_at: new Date().toISOString()
        });
    }
  }

  // Send shipping notification
  if (formattedPhone) {
    await sendOrderShippedWhatsApp(formattedPhone, {
      orderId,
      customerName: customer_name,
      trackingNumber: tracking_number,
      carrier: courierService,
      estimatedDelivery: deliveryDate,
      trackingUrl: tracking_url,
      shippingAddress: shipping_address
    });
  }

  // Send team notification
  if (process.env.TEAM_NOTIFICATION_ENABLED === 'true') {
    await sendTeamNotification('order_shipped', {
      order_id: orderId,
      customer_name,
      phone: formattedPhone,
      tracking_number,
      carrier: courierService,
      estimated_delivery: deliveryDate,
      source
    });
  }

  return {
    success: true,
    order_id: orderId,
    phone: formattedPhone,
    tracking_number,
    carrier: courierService,
    estimated_delivery: deliveryDate,
    source
  };
}

async function sendOrderShippedWhatsApp(phoneNumber: string, orderData: any) {
  try {
    const deliveryInfo = orderData.estimatedDelivery 
      ? `📅 Expected delivery: ${new Date(orderData.estimatedDelivery).toLocaleDateString('en-IN')}`
      : '📅 Delivery date will be updated soon';

    const trackingInfo = orderData.trackingNumber 
      ? `📦 Tracking: ${orderData.trackingNumber}${orderData.carrier ? ` (${orderData.carrier})` : ''}`
      : '📦 Tracking number will be provided soon';

    const message = `
🚚 Order Shipped - TecBunny Store

${orderData.customerName ? `Hi ${orderData.customerName}! ` : ''}Great news! Your order is on its way! 🎉

📦 Order: ${orderData.orderId}
${trackingInfo}
${deliveryInfo}

${orderData.trackingUrl ? `🔍 Track your order: ${orderData.trackingUrl}` : ''}

${orderData.shippingAddress ? `📍 Shipping to: ${orderData.shippingAddress}` : ''}

💡 Delivery Tips:
• Keep your phone handy for delivery updates
• Someone should be available to receive the package
• Check package contents upon delivery

Questions? Reply to this message or call +91 9429694995

Thank you for choosing TecBunny! 🚀
    `.trim();

    await sendWhatsAppNotification(phoneNumber, message);
    logger.info('Order shipped WhatsApp sent:', { 
      phoneNumber, 
      orderId: orderData.orderId,
      trackingNumber: orderData.trackingNumber
    });
  } catch (error: any) {
    logger.error('Failed to send order shipped WhatsApp:', { error: error.message });
  }
}

async function sendTeamNotification(type: string, data: any) {
  try {
    const teamNumbers = [
      process.env.TEAM_WHATSAPP_1,
      process.env.TEAM_WHATSAPP_2
    ].filter(Boolean);

    const message = `
📦 Order Shipped Update!

📦 Order: ${data.order_id}
👤 Customer: ${data.customer_name || 'N/A'}
📱 Phone: ${data.phone || 'N/A'}
🚚 Tracking: ${data.tracking_number || 'N/A'}
🏢 Carrier: ${data.carrier || 'N/A'}
📅 Expected delivery: ${data.estimated_delivery ? new Date(data.estimated_delivery).toLocaleDateString('en-IN') : 'TBD'}
🔗 Source: ${data.source}

Time: ${new Date().toLocaleString('en-IN')}
Status: Package is in transit! 🚚
    `.trim();

    for (const number of teamNumbers) {
      if (number) {
        await sendWhatsAppNotification(number, message);
      }
    }
  } catch (error: any) {
    logger.error('Failed to send team notification:', { error: error.message });
  }
}

function validateWebhookSignature(signature: string | null, body: any, source: string): boolean {
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  if (!signature) {
    logger.warn('No webhook signature provided:', { source });
    return false;
  }

  return true;
}

async function logWebhookEvent(
  supabase: any, 
  eventType: string, 
  payload: any, 
  source: string, 
  processed: boolean, 
  errorMessage?: string
) {
  try {
    await supabase
      .from('webhook_events')
      .insert({
        source,
        event_type: eventType,
        payload,
        processed,
        error_message: errorMessage,
        created_at: new Date().toISOString()
      });
  } catch (error: any) {
    logger.error('Failed to log webhook event:', { error: error.message });
  }
}


