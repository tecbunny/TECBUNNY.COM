import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '../../../../lib/supabase/server';
import { 
  sendWelcomeTemplate,
  sendWhatsAppTemplate
} from '../../../../lib/superfone-whatsapp-service';
import { logger } from '../../../../lib/logger';
import { apiError, apiSuccess } from '../../../../lib/errors';

interface SuperfoneIncomingMessage {
  webhook_id: string;
  event_type: string;
  timestamp: string;
  data: {
    from: string;
    to: string;
    message?: {
      type: string;
      text?: string;
      media_url?: string;
    };
    contact?: {
      name?: string;
      phone: string;
    };
  };
}

// Enhanced Superfone webhook with auto-registration
export async function POST(request: NextRequest) {
  try {
    const correlationId = request.headers.get('x-correlation-id') || null;
    const supabase = await createClient();

    // Verify webhook signature (if you have a secret)
    const signature = request.headers.get('x-superfone-signature');
    const webhookSecret = process.env.SUPERFONE_WEBHOOK_SECRET;
    
    if (webhookSecret && signature) {
      // Add signature verification logic here if needed
      // const expectedSignature = crypto.createHmac('sha256', webhookSecret)
      //   .update(JSON.stringify(body))
      //   .digest('hex');
      // if (signature !== expectedSignature) {
      //   return apiError('UNAUTHORIZED', { correlationId });
      // }
    }

    const body: SuperfoneIncomingMessage = await request.json();
    
    logger.info('superfone_webhook_received', {
      webhook_id: body.webhook_id,
      event_type: body.event_type,
      from: body.data?.from,
      correlationId
    });

    const { event_type, data } = body;

    switch (event_type) {
      case 'message.received':
        await handleIncomingMessage(supabase, data, correlationId);
        break;
      
      case 'message.delivered':
        await handleMessageDelivered(supabase, data, correlationId);
        break;
      
      case 'message.read':
        await handleMessageRead(supabase, data, correlationId);
        break;
      
      case 'contact.created':
        await handleContactCreated(supabase, data, correlationId);
        break;
      
      default:
        logger.info('superfone_webhook_unhandled_event', { 
          event_type, 
          correlationId 
        });
    }

    return apiSuccess({ 
      message: 'Webhook processed successfully',
      event_type,
      webhook_id: body.webhook_id 
    }, correlationId);

  } catch (error) {
    const correlationId = request.headers.get('x-correlation-id') || null;
    logger.error('superfone_webhook_error', { error, correlationId });
    return apiError('INTERNAL_ERROR', { correlationId });
  }
}

// Handle incoming WhatsApp messages
async function handleIncomingMessage(supabase: any, data: any, correlationId: string | null) {
  try {
    const { from, message } = data;
    
    if (!from || !message) {
      logger.warn('superfone_incomplete_message_data', { data, correlationId });
      return;
    }

    // Clean and format phone number
    const cleanPhone = from.replace(/[^\d+]/g, '');
    const formattedPhone = cleanPhone.startsWith('+') ? cleanPhone : `+91${cleanPhone}`;

    logger.info('superfone_message_received', {
      from: formattedPhone,
      message_type: message.type,
      has_text: !!message.text,
      correlationId
    });

    // Check if customer exists
    const { data: existingCustomer, error: lookupError } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', formattedPhone)
      .single();
    let customer = existingCustomer;

    if (lookupError && lookupError.code === 'PGRST116') {
      // Customer doesn't exist, create new one
      // Extract potential name from message
      let potentialName = 'WhatsApp User';
      if (message.text) {
        const words = message.text.trim().split(' ');
        if (words.length >= 2 && words[0].toLowerCase() !== 'hi' && words[0].toLowerCase() !== 'hello') {
          potentialName = words.slice(0, 2).join(' ');
        }
      }

      const { data: newCustomer, error: createError } = await supabase
        .from('customers')
        .insert({
          phone: formattedPhone,
          name: potentialName,
          status: 'active',
          lead_source: 'whatsapp',
          external_source: 'superfone',
          consent_whatsapp: true,
          first_contact_date: new Date().toISOString(),
          last_contact_date: new Date().toISOString(),
          tags: ['whatsapp_contact', 'auto_registered']
        })
        .select()
        .single();

      if (createError) {
        logger.error('superfone_customer_creation_failed', { 
          error: createError, 
          phone: formattedPhone,
          correlationId 
        });
        return;
      }

      customer = newCustomer;
      
      logger.info('superfone_customer_auto_registered', {
        customer_id: customer.id,
        phone: formattedPhone,
        name: potentialName,
        correlationId
      });

      // Send welcome message to new customer
      setTimeout(async () => {
        try {
          await sendWelcomeTemplate(formattedPhone, potentialName);
          
          logger.info('superfone_welcome_sent', {
            customer_id: customer.id,
            phone: formattedPhone,
            correlationId
          });
        } catch (welcomeError) {
          logger.warn('superfone_welcome_failed', {
            error: welcomeError,
            customer_id: customer.id,
            correlationId
          });
        }
      }, 2000); // Delay to avoid immediate response

      // Notify admin about new auto-registration
      const adminPhone = process.env.ADMIN_WHATSAPP_NUMBER;
      if (adminPhone && adminPhone !== formattedPhone) {
        setTimeout(async () => {
          try {
            const adminMessage = `🤖 Auto-Registration Alert\n\n` +
              `📱 New WhatsApp contact added automatically\n` +
              `👤 Name: ${potentialName}\n` +
              `📞 Phone: ${formattedPhone}\n` +
              `💬 First Message: "${message.text?.substring(0, 100) || 'Media message'}"\n` +
              `📅 Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;

            await sendWhatsAppTemplate({
              templateName: 'admin_auto_registration',
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

            logger.info('superfone_admin_notification_sent', {
              customer_id: customer.id,
              admin_phone: adminPhone,
              correlationId
            });
          } catch (notificationError) {
            logger.warn('superfone_admin_notification_failed', {
              error: notificationError,
              correlationId
            });
          }
        }, 5000); // Delay admin notification
      }

    } else if (!lookupError) {
      // Update existing customer's last contact date
      await supabase
        .from('customers')
        .update({ 
          last_contact_date: new Date().toISOString() 
        })
        .eq('id', customer.id);

      logger.info('superfone_customer_contact_updated', {
        customer_id: customer.id,
        phone: formattedPhone,
        correlationId
      });
    }

    // Process the message for chatbot responses or business logic
    if (message.text) {
      await processTextMessage(supabase, customer, message.text, correlationId);
    }

    // Store message in conversation history if you have that table
    // await storeMessageHistory(supabase, customer.id, message, 'incoming', correlationId);

  } catch (error) {
    logger.error('superfone_handle_message_error', { 
      error, 
      from: data?.from,
      correlationId 
    });
  }
}

// Process text messages for business logic
async function processTextMessage(supabase: any, customer: any, messageText: string, correlationId: string | null) {
  try {
    const lowercaseText = messageText.toLowerCase().trim();
    
    // Simple keyword-based responses
    if (lowercaseText.includes('order') && lowercaseText.includes('status')) {
      // Customer asking about order status
      await handleOrderStatusInquiry(supabase, customer, correlationId);
    } else if (lowercaseText.includes('product') || lowercaseText.includes('catalog')) {
      // Customer asking about products
      await handleProductInquiry(customer, correlationId);
    } else if (lowercaseText.includes('support') || lowercaseText.includes('help')) {
      // Customer needs support
      await handleSupportRequest(customer, correlationId);
    }
    
    // Add more business logic as needed
    
  } catch (error) {
    logger.error('superfone_process_message_error', { 
      error, 
      customer_id: customer?.id,
      correlationId 
    });
  }
}

// Handle order status inquiries
async function handleOrderStatusInquiry(supabase: any, customer: any, correlationId: string | null) {
  try {
    // Get customer's recent orders
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, status, total, created_at')
      .or(`customer_phone.eq.${customer.phone},customer_id.eq.${customer.id}`)
      .order('created_at', { ascending: false })
      .limit(3);

    if (error || !orders || orders.length === 0) {
      const noOrdersMessage = `Hi ${customer.name}! 👋\n\n` +
        `I couldn't find any recent orders for your number.\n` +
        `If you have placed an order, please contact our support team with your order details.`;

      await sendWhatsAppTemplate({
        templateName: 'order_status_response',
        language: 'en',
        recipient: customer.phone,
        components: [
          {
            type: 'text',
            parameters: [
              { type: 'text', text: noOrdersMessage }
            ]
          }
        ]
      });
      return;
    }

    // Format order status message
    let statusMessage = `Hi ${customer.name}! 📋\n\nHere are your recent orders:\n\n`;
    
    orders.forEach((order: any, index: number) => {
      statusMessage += `${index + 1}. Order #${order.id}\n`;
      statusMessage += `   💰 Amount: ₹${order.total}\n`;
      statusMessage += `   📊 Status: ${order.status.toUpperCase()}\n`;
      statusMessage += `   📅 Date: ${new Date(order.created_at).toLocaleDateString('en-IN')}\n\n`;
    });

    statusMessage += `For detailed tracking, please contact our support team.`;

    await sendWhatsAppTemplate({
      templateName: 'order_status_response',
      language: 'en',
      recipient: customer.phone,
      components: [
        {
          type: 'text',
          parameters: [
            { type: 'text', text: statusMessage }
          ]
        }
      ]
    });

    logger.info('superfone_order_status_sent', {
      customer_id: customer.id,
      orders_count: orders.length,
      correlationId
    });

  } catch (error) {
    logger.error('superfone_order_status_error', { 
      error, 
      customer_id: customer.id,
      correlationId 
    });
  }
}

// Handle product inquiries
async function handleProductInquiry(customer: any, correlationId: string | null) {
  try {
    const productMessage = `Hi ${customer.name}! 🛍️\n\n` +
      `Thank you for your interest in our products!\n\n` +
      `🖱️ Gaming Mice & Keyboards\n` +
      `🎧 Audio Accessories\n` +
      `💻 Computer Accessories\n` +
      `📱 Mobile Accessories\n\n` +
      `Visit our website to browse our complete catalog:\n` +
      `🌐 https://tecbunny.com\n\n` +
      `Or speak to our sales team for personalized recommendations!`;

    await sendWhatsAppTemplate({
      templateName: 'product_inquiry_response',
      language: 'en',
      recipient: customer.phone,
      components: [
        {
          type: 'text',
          parameters: [
            { type: 'text', text: productMessage }
          ]
        }
      ]
    });

    logger.info('superfone_product_inquiry_sent', {
      customer_id: customer.id,
      correlationId
    });

  } catch (error) {
    logger.error('superfone_product_inquiry_error', { 
      error, 
      customer_id: customer.id,
      correlationId 
    });
  }
}

// Handle support requests
async function handleSupportRequest(customer: any, correlationId: string | null) {
  try {
    const supportMessage = `Hi ${customer.name}! 🤝\n\n` +
      `Our support team is here to help you!\n\n` +
      `📞 Call: +91-XXXXXXXXXX\n` +
      `📧 Email: support@tecbunny.com\n` +
      `💬 WhatsApp: This number\n` +
      `🕒 Hours: 9 AM - 6 PM (Mon-Sat)\n\n` +
      `Please describe your issue and we'll get back to you shortly.`;

    await sendWhatsAppTemplate({
      templateName: 'support_response',
      language: 'en',
      recipient: customer.phone,
      components: [
        {
          type: 'text',
          parameters: [
            { type: 'text', text: supportMessage }
          ]
        }
      ]
    });

    // Notify support team
    const adminPhone = process.env.ADMIN_WHATSAPP_NUMBER;
    if (adminPhone && adminPhone !== customer.phone) {
      const supportAlert = `🆘 Support Request\n\n` +
        `👤 Customer: ${customer.name}\n` +
        `📱 Phone: ${customer.phone}\n` +
        `📧 Email: ${customer.email || 'Not provided'}\n` +
        `⏰ Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n\n` +
        `Customer has requested support assistance.`;

      await sendWhatsAppTemplate({
        templateName: 'support_alert',
        language: 'en',
        recipient: adminPhone,
        components: [
          {
            type: 'text',
            parameters: [
              { type: 'text', text: supportAlert }
            ]
          }
        ]
      });
    }

    logger.info('superfone_support_request_handled', {
      customer_id: customer.id,
      correlationId
    });

  } catch (error) {
    logger.error('superfone_support_request_error', { 
      error, 
      customer_id: customer.id,
      correlationId 
    });
  }
}

// Handle message delivery confirmations
async function handleMessageDelivered(supabase: any, data: any, correlationId: string | null) {
  logger.info('superfone_message_delivered', { 
    to: data?.to,
    correlationId 
  });
  // Add delivery tracking logic if needed
}

// Handle message read confirmations
async function handleMessageRead(supabase: any, data: any, correlationId: string | null) {
  logger.info('superfone_message_read', { 
    to: data?.to,
    correlationId 
  });
  // Add read tracking logic if needed
}

// Handle contact creation
async function handleContactCreated(supabase: any, data: any, correlationId: string | null) {
  logger.info('superfone_contact_created', { 
    contact: data?.contact,
    correlationId 
  });
  // Handle external contact creation if needed
}

// Handle webhook verification (GET request)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get('hub.challenge');
  const verify_token = searchParams.get('hub.verify_token');
  
  // Verify token if configured
  const expectedToken = process.env.SUPERFONE_VERIFY_TOKEN;
  if (expectedToken && verify_token !== expectedToken) {
    return new NextResponse('Forbidden', { status: 403 });
  }
  
  // Return challenge for webhook verification
  if (challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  
  return apiSuccess({ message: 'Superfone webhook endpoint active' });
}