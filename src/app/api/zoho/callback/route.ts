import { NextRequest, NextResponse } from 'next/server';

import { logger } from '../../../../lib/logger';

export const dynamic = 'force-dynamic'

/**
 * Zoho OAuth Callback Handler
 * Handles the redirect from Zoho after user authorization
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state');
    
    logger.info('Zoho callback received:', { code: !!code, error, state });
    
    if (error) {
      // User denied authorization or error occurred
      logger.warn('Zoho OAuth error:', { error });
      return NextResponse.redirect(
        new URL(`/management/integrations/zoho?error=${encodeURIComponent(error)}`, request.url)
      );
    }
    
    if (!code) {
      // No authorization code received - might be a direct visit
      logger.warn('No authorization code received');
      return NextResponse.json({
        error: 'No authorization code received. This endpoint should only be accessed via Zoho OAuth redirect.',
        message: 'Please visit /management/integrations/zoho to start the OAuth flow.'
      }, { status: 400 });
    }
    
    logger.info('Valid authorization code received, redirecting to integration page');
    
    // Redirect to the integration page with the authorization code
    return NextResponse.redirect(
      new URL(`/management/integrations/zoho?code=${encodeURIComponent(code)}`, request.url)
    );
    
  } catch (error) {
    logger.error('Error handling Zoho callback:', { error });
    return NextResponse.json({
      error: 'Callback processing failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}