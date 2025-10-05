import { NextRequest, NextResponse } from 'next/server';

import { ZohoInventoryAPI } from '../../../../lib/zoho-inventory';
import { logger } from '../../../../lib/logger';

// Zoho configuration from environment variables
const zohoConfig = {
  clientId: process.env.ZOHO_CLIENT_ID!,
  clientSecret: process.env.ZOHO_CLIENT_SECRET!,
  redirectUri: process.env.ZOHO_REDIRECT_URI!,
  organizationId: process.env.ZOHO_ORGANIZATION_ID!,
  accessToken: process.env.ZOHO_ACCESS_TOKEN,
  refreshToken: process.env.ZOHO_REFRESH_TOKEN,
};

/**
 * GET /api/zoho/auth
 * Get Zoho OAuth authorization URL
 */
export async function GET(_request: NextRequest) {
  try {
    const zohoAPI = new ZohoInventoryAPI(zohoConfig);
    const authURL = zohoAPI.getAuthURL();
    
    return NextResponse.json({ authURL });
  } catch (error) {
    logger.error('Error getting Zoho auth URL:', { error });
    return NextResponse.json(
      { error: 'Failed to get authorization URL' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/zoho/auth
 * Exchange authorization code for access token
 */
export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    
    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code is required' },
        { status: 400 }
      );
    }

    const zohoAPI = new ZohoInventoryAPI(zohoConfig);
    const tokens = await zohoAPI.getAccessToken(code);
    
    // Save tokens to environment or database
    // For security, you should store these encrypted in your database
    logger.info('Zoho tokens received:', {
      access_token: `${tokens.access_token.substring(0, 10)}...`,
      refresh_token: `${tokens.refresh_token.substring(0, 10)}...`
    });
    
    return NextResponse.json({
      message: 'Authentication successful',
      tokenReceived: true,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: (tokens as any).expires_in || 3600
    });
  } catch (error) {
    logger.error('Error exchanging authorization code:', { error });
    return NextResponse.json(
      { error: 'Failed to exchange authorization code' },
      { status: 500 }
    );
  }
}