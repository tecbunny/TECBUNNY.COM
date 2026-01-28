import { randomUUID } from 'crypto';

import { logger } from '../logger';

export interface InfobipSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  raw?: any;
}

function normalizeRecipient(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('91')) return `+${cleaned}`;
  if (cleaned.length === 10) return `+91${cleaned}`;
  return `+${cleaned}`;
}

function resolvePlaceholders(code: string): string[] {
  const raw = process.env.INFOBIP_OTP_TEMPLATE_PLACEHOLDERS;
  if (!raw) return [code];
  const placeholders = raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => value.replace(/\{code\}/g, code));
  return placeholders.length ? placeholders : [code];
}

function resolveButtonParameter(code: string, userName: string, override?: string): string | undefined {
  if (override && override.trim()) {
    return override.trim();
  }
  const raw = process.env.INFOBIP_OTP_TEMPLATE_BUTTON_PARAM;
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  return trimmed
    .replace(/\{code\}/g, code)
    .replace(/\{name\}/g, userName);
}

export async function sendInfobipWhatsAppOtp(
  phone: string,
  code: string,
  userName: string = 'Customer',
  buttonParameter?: string
): Promise<InfobipSendResult> {
  const apiKey = process.env.INFOBIP_API_KEY;
  let baseUrl = process.env.INFOBIP_BASE_URL;
  const from = process.env.INFOBIP_WHATSAPP_FROM;
  const templateName = process.env.INFOBIP_WHATSAPP_TEMPLATE_NAME;
  const language = process.env.INFOBIP_WHATSAPP_TEMPLATE_LANGUAGE || 'en';

  if (!apiKey || !baseUrl || !from || !templateName) {
    return {
      success: false,
      error: 'Infobip configuration missing (INFOBIP_API_KEY, INFOBIP_BASE_URL, INFOBIP_WHATSAPP_FROM, INFOBIP_WHATSAPP_TEMPLATE_NAME)'
    };
  }

  baseUrl = baseUrl.trim();
  if (!/^https?:\/\//i.test(baseUrl)) {
    baseUrl = `https://${baseUrl}`;
  }

  const to = normalizeRecipient(phone);
  if (!to) {
    return { success: false, error: 'Invalid recipient number' };
  }

  const buttonParam = resolveButtonParameter(code, userName, buttonParameter);

  const payload = {
    messages: [
      {
        from,
        to,
        messageId: randomUUID(),
        content: {
          templateName,
          templateData: {
            body: {
              placeholders: resolvePlaceholders(code)
            },
            ...(buttonParam
              ? {
                  buttons: [
                    {
                      type: 'URL',
                      parameter: buttonParam
                    }
                  ]
                }
              : {})
          },
          language
        },
        callbackData: userName
      }
    ]
  };

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/whatsapp/1/message/template`, {
      method: 'POST',
      headers: {
        'Authorization': `App ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      logger.error('Infobip WhatsApp OTP send failed', {
        status: response.status,
        response: result
      });
      return {
        success: false,
        error: result?.requestError?.serviceException?.text || result?.message || `HTTP ${response.status}`,
        raw: result
      };
    }

    if (result?.requestError?.serviceException?.text) {
      logger.error('Infobip WhatsApp OTP request error', {
        response: result
      });
      return {
        success: false,
        error: result.requestError.serviceException.text,
        raw: result
      };
    }

    const message = result?.messages?.[0];
    const messageId = message?.messageId;
    const status = message?.status;

    if (status?.groupName && ['REJECTED', 'UNDELIVERABLE', 'FAILED'].includes(status.groupName)) {
      logger.error('Infobip WhatsApp OTP delivery rejected', { to, status, response: result });
      return {
        success: false,
        error: status.description || 'WhatsApp delivery rejected',
        raw: result
      };
    }

    logger.info('Infobip WhatsApp OTP accepted', { to, messageId, status });

    return {
      success: true,
      messageId,
      raw: result
    };
  } catch (error: any) {
    logger.error('Infobip WhatsApp OTP request failed', { error: error?.message || error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Infobip request failed'
    };
  }
}
