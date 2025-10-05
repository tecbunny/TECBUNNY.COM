// Type definitions for Superfone API webhooks
export interface SuperfoneWebhookPayload {
  event_type: 'call.initiated' | 'call.answered' | 'call.ended' | 'call.missed' | 
             'message.received' | 'message.sent' | 'contact.created' | 'lead.generated' |
             'call.recording.completed' | 'sms.received' | 'sms.sent' | 'call.transferred';
  data: SuperfoneEventData;
  timestamp?: string;
  event_id?: string;
  webhook_id?: string;
  account_id?: string;
  api_version?: string;
}

export interface SuperfoneEventData {
  // Call-related fields
  call_id?: string;
  call_uuid?: string;
  from_number?: string;
  to_number?: string;
  caller_id?: string;
  called_number?: string;
  call_direction?: 'inbound' | 'outbound';
  call_status?: 'initiated' | 'ringing' | 'answered' | 'completed' | 'failed' | 'busy' | 'no-answer' | 'cancelled';
  call_duration?: number;
  call_start_time?: string;
  call_end_time?: string;
  recording_url?: string;
  recording_duration?: number;
  
  // Contact/Customer fields
  contact_id?: string;
  contact_name?: string;
  phone_number?: string;
  email?: string;
  custom_fields?: Record<string, any>;
  
  // Message fields
  message_id?: string;
  message_type?: 'sms' | 'whatsapp' | 'voice';
  message_content?: string;
  message_direction?: 'inbound' | 'outbound';
  media_url?: string;
  media_type?: string;
  
  // Lead/Campaign fields
  lead_id?: string;
  campaign_id?: string;
  campaign_name?: string;
  lead_source?: string;
  lead_score?: number;
  tags?: string[];
  
  // Agent/User fields
  agent_id?: string;
  agent_name?: string;
  queue_name?: string;
  
  // System fields
  timestamp?: string;
  created_at?: string;
  updated_at?: string;
  metadata?: Record<string, any>;
}

export interface SuperfonePhoneContact {
  phone_number: string;
  caller_name?: string;
  call_duration?: number;
  call_status: string;
  call_recording_url?: string;
  timestamp: string;
  lead_source?: string;
  call_direction?: 'inbound' | 'outbound';
}

export interface SuperfoneWhatsAppMessage {
  from_number: string;
  to_number?: string;
  message_content: string;
  message_type: 'text' | 'image' | 'video' | 'document' | 'audio';
  media_url?: string;
  timestamp: string;
  message_id: string;
  direction?: 'inbound' | 'outbound';
}

export interface SuperfoneLead {
  phone_number: string;
  name?: string;
  email?: string;
  source: string;
  campaign?: string;
  custom_fields?: Record<string, any>;
  lead_score?: number;
  timestamp?: string;
}

export interface SuperfoneResponse {
  status: 'processed' | 'ignored' | 'error';
  customer_id?: string;
  lead_id?: string;
  action?: 'created' | 'updated';
  message?: string;
  error?: string;
}

// API Configuration
export interface SuperfoneConfig {
  apiKey?: string;
  webhookSecret?: string;
  baseUrl?: string;
  timeout?: number;
}
