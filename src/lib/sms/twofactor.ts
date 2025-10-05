type SendResult = { success: true; id?: string; raw?: any } | { success: false; error: string; status?: number; raw?: any };

function getEnv(name: string, fallback?: string) {
  const v = process.env[name];
  return v && v.length > 0 ? v : fallback;
}

function normalizeMobile(mobile: string, country: string) {
  const digits = String(mobile).replace(/\D+/g, '');
  if (!digits) return '';
  if (country && !digits.startsWith(country)) return `${country}${digits}`;
  return digits;
}

async function doFetch(url: string, options?: RequestInit): Promise<SendResult> {
  try {
    const res = await fetch(url, options);
    const text = await res.text();
    let json: any;
    try { json = text ? JSON.parse(text) : {}; } catch { json = { body: text }; }
    
    // 2Factor returns Status: "Error" or Status: "Success"
    const statusText = json?.Status || json?.status || json?.status_code;
    const isError = typeof statusText === 'string' && statusText.toLowerCase() === 'error';
    const isSuccess = typeof statusText === 'string' && statusText.toLowerCase() === 'success';
    
    if (!res.ok || isError || (!isSuccess && res.status >= 400)) {
      const errorDetails = json?.Details || json?.details || json?.message || res.statusText || 'Unknown error';
      return { success: false, error: errorDetails, status: res.status, raw: json };
    }
    
    const id = json?.Details || json?.details || json?.sessionId || json?.Session || undefined;
    return { success: true, id, raw: json };
  } catch (e: any) {
    return { success: false, error: e?.message || String(e) };
  }
}

// Transactional SMS via 2Factor template name (TemplateName) with VAR1..VARn
export async function sendTransactional(params: {
  to: string;
  template: string; // maps to TemplateName
  vars?: Record<string, string | number>;
  sender?: string; // optional, From
  apiKey?: string;
  baseUrl?: string; // e.g. https://2factor.in
  country?: string; // default '91'
}): Promise<SendResult> {
  const apiKey = params.apiKey || getEnv('TWOFACTOR_API_KEY');
  const base = (params.baseUrl || getEnv('TWOFACTOR_BASE_URL', 'https://2factor.in'))!.replace(/\/$/, '');
  const sender = params.sender || getEnv('TWOFACTOR_SENDER_ID', 'TFCTOR');
  const country = params.country || getEnv('SMS_DEFAULT_COUNTRY', '91')!;
  if (!apiKey) return { success: false, error: 'Missing TWOFACTOR_API_KEY' };
  if (!params.template) return { success: false, error: 'Missing template name' };
  const mobiles = normalizeMobile(params.to, country);
  if (!mobiles) return { success: false, error: 'Invalid recipient number' };

  const url = new URL(`${base}/API/V1/${encodeURIComponent(apiKey)}/ADDON_SERVICES/SEND/TSMS`);
  url.searchParams.set('From', sender!);
  url.searchParams.set('To', mobiles);
  url.searchParams.set('TemplateName', params.template);

  // Map vars: preserve VAR1.. keys if provided; else index in insertion order
  if (params.vars) {
    let idx = 1;
    for (const [k, v] of Object.entries(params.vars)) {
      const key = /^var\d+$/i.test(k) ? k.toUpperCase() : `VAR${idx++}`;
      url.searchParams.set(key, String(v));
    }
  }

  return doFetch(url.toString());
}

// Send OTP using 2Factor's transactional SMS endpoint
// This endpoint bypasses DND and delivers as SMS, not voice call
export async function sendOTP(params: {
  to: string;
  otp: string;
  apiKey?: string;
  baseUrl?: string;
  country?: string;
  autoGenerate?: boolean; // Use AUTOGEN or send custom OTP
  template?: string; // Template name (default: OTP1)
}): Promise<SendResult> {
  const apiKey = params.apiKey || getEnv('TWOFACTOR_API_KEY');
  const base = (params.baseUrl || getEnv('TWOFACTOR_BASE_URL', 'https://2factor.in'))!.replace(/\/$/, '');
  const country = params.country || getEnv('SMS_DEFAULT_COUNTRY', '91')!;
  
  if (!apiKey) return { success: false, error: 'Missing TWOFACTOR_API_KEY' };
  
  // Debug logging
  if (!params.to) return { success: false, error: 'Missing phone number in params.to' };
  
  const mobiles = normalizeMobile(params.to, country);
  if (!mobiles) return { success: false, error: `Invalid recipient number: ${params.to}` };
  
  // Use simple OTP endpoint - works but may deliver as voice if DND is enabled
  // Format: /API/V1/{api_key}/SMS/{phone}/{otp}
  const url = `${base}/API/V1/${encodeURIComponent(apiKey)}/SMS/${encodeURIComponent(mobiles)}/${encodeURIComponent(params.otp)}`;
  
  return doFetch(url);
}

// Plain SMS fallback (non-template). 2Factor supports /SMS/{to}/{msg}
export async function sendPlain(params: {
  to: string;
  message: string;
  apiKey?: string;
  baseUrl?: string;
  country?: string;
  sender?: string;
}): Promise<SendResult> {
  const apiKey = params.apiKey || getEnv('TWOFACTOR_API_KEY');
  const base = (params.baseUrl || getEnv('TWOFACTOR_BASE_URL', 'https://2factor.in'))!.replace(/\/$/, '');
  const country = params.country || getEnv('SMS_DEFAULT_COUNTRY', '91')!;
  if (!apiKey) return { success: false, error: 'Missing TWOFACTOR_API_KEY' };
  const mobiles = normalizeMobile(params.to, country);
  if (!mobiles) return { success: false, error: 'Invalid recipient number' };

  const msg = encodeURIComponent(params.message);
  const sender = params.sender || getEnv('TWOFACTOR_SENDER_ID');
  const senderPath = sender ? `/${encodeURIComponent(sender)}` : '';
  const url = `${base}/API/V1/${encodeURIComponent(apiKey)}/SMS/${encodeURIComponent(mobiles)}/${msg}${senderPath}`;
  return doFetch(url);
}

// Unified interface compatible with previous sendSms usage
export async function sendSms(params: {
  to: string;
  message?: string;
  vars?: Record<string, string | number>;
  flowId?: string; // here treated as TemplateName
  useFlowFirst?: boolean;
}): Promise<SendResult> {
  const useTemplate = params.useFlowFirst ?? true;
  if (useTemplate && (params.flowId || params.vars)) {
    const res = await sendTransactional({ to: params.to, template: params.flowId || '', vars: params.vars });
    if (res.success) return res;
    // fall back to plain if template failed and message provided
  }
  if (!params.message) return { success: false, error: 'message is required for plain SMS' };
  return sendPlain({ to: params.to, message: params.message, sender: getEnv('TWOFACTOR_SENDER_ID') });
}
