import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-utils';
import { getGoogleAuthUrl } from '@/lib/google-client';
import { createOAuthState } from '@/lib/oauth-state';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated', message: 'You must be logged in to connect your Google account' },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token', message: 'Your session has expired. Please log in again.' },
        { status: 401 }
      );
    }

    const state = createOAuthState(payload.userId);
    const authUrl = getGoogleAuthUrl(state);

    console.log('[OAuth] Generated auth URL for user:', payload.userId);

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('[OAuth] Get auth URL error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to generate authorization URL' },
      { status: 500 }
    );
  }
}
