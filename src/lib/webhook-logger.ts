import { logger } from '../lib/logger';

// Shared webhook event logging utility
export async function logWebhookEvent(
  supabase: any,
  eventType: string,
  payload: any,
  source: string,
  processed: boolean,
  errorMessage?: string,
  startTime?: Date
) {
  try {
    const now = new Date();
    const processedAt = processed ? now.toISOString() : null;
    
    // Determine status based on processed flag and error
    let status = 'unknown';
    if (processed && !errorMessage) {
      status = 'processed';
    } else if (processed && errorMessage) {
      status = 'processed_with_warnings';
    } else if (!processed && errorMessage) {
      status = 'failed';
    } else {
      status = 'pending';
    }

    const webhookEvent = {
      source,
      event_type: eventType,
      payload,
      processed,
      status,
      error_message: errorMessage,
      created_at: startTime ? startTime.toISOString() : now.toISOString(),
      processed_at: processedAt,
      updated_at: now.toISOString()
    };

    const { error } = await supabase
      .from('webhook_events')
      .insert(webhookEvent);

    if (error) {
      logger.error('Failed to log webhook event to database:', { 
        error: error.message,
        eventType,
        source 
      });
    } else {
      logger.debug('Webhook event logged successfully:', { 
        eventType, 
        source, 
        status,
        processed 
      });
    }

  } catch (error: any) {
    logger.error('Failed to log webhook event:', { 
      error: error.message,
      eventType,
      source 
    });
  }
}

// Update existing webhook event with processed status
export async function updateWebhookEventStatus(
  supabase: any,
  eventId: string,
  processed: boolean,
  errorMessage?: string
) {
  try {
    const now = new Date();
    let status = 'unknown';
    
    if (processed && !errorMessage) {
      status = 'processed';
    } else if (processed && errorMessage) {
      status = 'processed_with_warnings';
    } else if (!processed && errorMessage) {
      status = 'failed';
    }

    const { error } = await supabase
      .from('webhook_events')
      .update({
        processed,
        status,
        error_message: errorMessage,
        processed_at: processed ? now.toISOString() : null,
        updated_at: now.toISOString()
      })
      .eq('id', eventId);

    if (error) {
      logger.error('Failed to update webhook event status:', { 
        error: error.message,
        eventId,
        status 
      });
    }

  } catch (error: any) {
    logger.error('Failed to update webhook event status:', { 
      error: error.message,
      eventId 
    });
  }
}

// Webhook event status types for consistency
export type WebhookEventStatus = 
  | 'pending'
  | 'processed' 
  | 'failed'
  | 'processed_with_warnings'
  | 'unknown';

// Helper to get webhook processing time in seconds
export function getProcessingTimeSeconds(createdAt: string, processedAt: string | null): number | null {
  if (!processedAt) return null;
  
  try {
    const created = new Date(createdAt);
    const processed = new Date(processedAt);
    return (processed.getTime() - created.getTime()) / 1000;
  } catch {
    return null;
  }
}