import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createServiceClient, createClient as createServerClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { isAdmin } from '@/lib/permissions';
import improvedEmailService from '@/lib/improved-email-service';
import type { ContactMessage, ContactMessageStatus } from '@/lib/types';

const CONTACT_RATE_LIMIT = {
  limit: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
};

const createMessageSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().min(5).max(160),
  phone: z.string().min(6).max(32).optional().or(z.literal('').transform(() => undefined)),
  subject: z.string().min(2).max(160).optional().or(z.literal('').transform(() => undefined)),
  message: z.string().min(10).max(5000),
});

const statusFilterSchema = z.object({
  status: z
    .union([z.enum(['New', 'In Progress', 'Resolved']), z.literal('all'), z.literal('ALL')])
    .optional()
    .transform(value => {
      if (!value) return undefined;
      return value.toLowerCase() === 'all' ? undefined : value;
    }),
  limit: z
    .string()
    .transform(value => Number.parseInt(value, 10))
    .pipe(z.number().min(1).max(200))
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const submissionIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anonymous';
    if (!rateLimit(submissionIp, 'contact_messages_post', CONTACT_RATE_LIMIT)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const body = await request.json();
    const parsed = createMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const serviceSupabase = createServiceClient();
    const payload = {
      name: parsed.data.name.trim(),
      email: parsed.data.email.trim().toLowerCase(),
      phone: parsed.data.phone?.trim() || null,
      subject: parsed.data.subject?.trim() || null,
      message: parsed.data.message.trim(),
      status: 'New' as ContactMessageStatus,
      ip_address: submissionIp === 'anonymous' ? null : submissionIp,
    };

    const { data, error } = await serviceSupabase
      .from('contact_messages')
      .insert(payload)
      .select('id')
      .single();

    if (error) {
      logger.error('contact_message_insert_failed', { error: error.message });
      return NextResponse.json({ error: 'Failed to submit message' }, { status: 500 });
    }

    logger.info('contact_message_created', { messageId: data?.id, ip: submissionIp });

    // Fire-and-forget admin notification email
    const adminEmail = process.env.ADMIN_EMAIL || 'support@tecbunny.com';
    improvedEmailService.sendEmail({
      to: adminEmail,
      subject: `New Request: ${payload.subject || 'Contact Form'} — ${payload.name}`,
      html: `
        <div style="font-family:sans-serif;max-width:580px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:12px">
          <div style="background:linear-gradient(135deg,#06b6d4,#7c3aed);padding:20px 24px;border-radius:8px;margin-bottom:24px">
            <h1 style="margin:0;font-size:20px;color:#fff">New Service Request</h1>
            <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.75)">Received on TecBunny.com</p>
          </div>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px 0;color:#94a3b8;font-size:13px">Name</td><td style="padding:8px 0;font-weight:bold">${payload.name}</td></tr>
            <tr><td style="padding:8px 0;color:#94a3b8;font-size:13px">Email</td><td style="padding:8px 0"><a href="mailto:${payload.email}" style="color:#06b6d4">${payload.email}</a></td></tr>
            <tr><td style="padding:8px 0;color:#94a3b8;font-size:13px">Phone</td><td style="padding:8px 0">${payload.phone || '—'}</td></tr>
            <tr><td style="padding:8px 0;color:#94a3b8;font-size:13px">Service</td><td style="padding:8px 0">${payload.subject || '—'}</td></tr>
          </table>
          <div style="margin-top:20px;background:#1e293b;border-radius:8px;padding:16px">
            <p style="margin:0 0 8px;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:.05em">Message</p>
            <p style="margin:0;white-space:pre-wrap;font-size:14px">${payload.message}</p>
          </div>
          <div style="margin-top:24px;text-align:center">
            <a href="https://www.tecbunny.com/management/admin/contact-messages" style="background:#06b6d4;color:#000;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px">View in Admin Panel</a>
          </div>
          <p style="margin-top:24px;font-size:11px;color:#475569;text-align:center">TecBunny Solutions · Goa, India · +91 96041 36010</p>
        </div>
      `,
    }).catch((err: unknown) => {
      logger.warn('admin_notification_email_failed', { error: err instanceof Error ? err.message : String(err) });
    });

    // Fire-and-forget customer acknowledgment email
    const serviceName = payload.subject || 'your enquiry';
    improvedEmailService.sendEmail({
      to: payload.email,
      subject: `We received your request — TecBunny Solutions`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:12px">
          <div style="background:linear-gradient(135deg,#06b6d4,#7c3aed);padding:20px 24px;border-radius:8px;margin-bottom:24px">
            <h1 style="margin:0;font-size:20px;color:#fff">Hi ${payload.name.split(' ')[0]}, thanks for reaching out!</h1>
            <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.75)">TecBunny Solutions · Goa, India</p>
          </div>
          <p style="font-size:15px;line-height:1.6">We've received your request about <strong>${serviceName}</strong> and our team is reviewing it.</p>
          <p style="font-size:15px;line-height:1.6">We'll get back to you within <strong>24 hours</strong> with next steps, a quote, or to schedule a site visit.</p>
          <div style="margin:24px 0;background:#1e293b;border-radius:8px;padding:16px;border-left:4px solid #06b6d4">
            <p style="margin:0;font-size:13px;color:#94a3b8">Your message</p>
            <p style="margin:8px 0 0;font-size:14px;white-space:pre-wrap">${payload.message}</p>
          </div>
          <p style="font-size:14px;color:#94a3b8">Need urgent help? Call us directly:</p>
          <p style="font-size:15px;font-weight:bold"><a href="tel:+919172529309" style="color:#06b6d4;text-decoration:none">+91 91725 29309</a></p>
          <hr style="border:none;border-top:1px solid #1e293b;margin:24px 0" />
          <p style="font-size:11px;color:#475569;text-align:center">TecBunny Solutions Pvt. Ltd. · Goa, India · <a href="https://www.tecbunny.com" style="color:#475569">tecbunny.com</a></p>
        </div>
      `,
    }).catch((err: unknown) => {
      logger.warn('customer_acknowledgment_email_failed', { error: err instanceof Error ? err.message : String(err) });
    });

    return NextResponse.json({ success: true, id: data?.id }, { status: 201 });
  } catch (error) {
    logger.error('contact_message_post_unexpected', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: auth } = await supabase.auth.getUser();

    if (!auth?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const isUserAdmin = await isAdmin(auth.user);
    if (!isUserAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());
    const parsedFilters = statusFilterSchema.safeParse(params);

    if (!parsedFilters.success) {
      return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
    }

    const serviceSupabase = createServiceClient();
    let query = serviceSupabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (parsedFilters.data.status) {
      query = query.eq('status', parsedFilters.data.status as ContactMessageStatus);
    }

    if (parsedFilters.data.limit) {
      query = query.limit(parsedFilters.data.limit);
    } else {
      query = query.limit(100);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('contact_message_list_failed', { error: error.message });
      return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 });
    }

    return NextResponse.json({ data: (data ?? []) as ContactMessage[] });
  } catch (error) {
    logger.error('contact_message_get_unexpected', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
