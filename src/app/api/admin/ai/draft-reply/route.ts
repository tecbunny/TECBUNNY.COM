import { NextRequest, NextResponse } from 'next/server';

import { requireAdminContext } from '../../../../../lib/auth/admin-guard';
import { generateGeminiText } from '../../../../../lib/ai/gemini-service';
import { logger } from '../../../../../lib/logger';

const REPLY_SYSTEM = `You are a professional customer support executive at TecBunny Solutions, a CCTV and IT services company in Goa, India.
Write a warm, professional reply email to a customer enquiry.

RULES:
- Address the customer by first name
- Acknowledge their specific request (mention the service they asked about)
- Confirm we will be in touch within 24 hours or ask for availability for a site visit / call
- Keep tone: helpful, confident, professional
- Length: 80–120 words
- Do NOT mention prices
- Sign off as: "TecBunny Support Team | +91 9172529309 | tecbunny.com"
- Output ONLY the email body — no subject line, no markdown fences`;

export async function POST(request: NextRequest) {
  try {
    await requireAdminContext();

    const body = await request.json();
    const name: string = typeof body.name === 'string' ? body.name.trim() : '';
    const subject: string = typeof body.subject === 'string' ? body.subject.trim() : '';
    const message: string = typeof body.message === 'string' ? body.message.trim() : '';

    if (!name || !message) {
      return NextResponse.json({ error: 'Name and message are required.' }, { status: 400 });
    }

    const firstName = name.split(' ')[0];
    const prompt = [
      `Customer name: ${name} (use first name "${firstName}")`,
      `Service / subject: ${subject || 'General enquiry'}`,
      `Customer message:\n${message}`,
      '',
      'Write the reply email body:',
    ].join('\n');

    const draft = await generateGeminiText({
      prompt,
      systemInstruction: REPLY_SYSTEM,
      temperature: 0.6,
      maxOutputTokens: 300,
    });

    if (!draft) {
      return NextResponse.json({ error: 'AI could not generate a reply. Try again.' }, { status: 500 });
    }

    logger.info('admin_ai_draft_reply.success', { subject, nameLen: name.length });
    return NextResponse.json({ draft });
  } catch (error) {
    logger.error('admin_ai_draft_reply.error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Failed to generate reply.' }, { status: 500 });
  }
}
