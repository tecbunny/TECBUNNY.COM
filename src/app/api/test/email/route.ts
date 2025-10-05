import { NextRequest, NextResponse } from 'next/server';

import improvedEmailService from '../../../../lib/improved-email-service';
import { logger } from '../../../../lib/logger';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check SMTP configuration
    const config = {
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_PORT: process.env.SMTP_PORT,
      SMTP_USER: process.env.SMTP_USER,
      SMTP_FROM: process.env.SMTP_FROM,
      hasPassword: !!process.env.SMTP_PASS
    };

    logger.info('test_email.config', config);

    // Try to get connection status
    const status = await improvedEmailService.getConnectionStatus();
    logger.info('test_email.connection_status', status);

    // Try sending test email
    const result = await improvedEmailService.sendTestEmail(
      email,
      'Test Email from TecBunny',
      'This is a test email to verify SMTP configuration is working correctly.'
    );

    logger.info('test_email.result', { result: JSON.stringify(result) });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully',
        config,
        status,
        result
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
        config,
        status
      }, { status: 500 });
    }

  } catch (error) {
    logger.error('test_email.error', { error });
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
