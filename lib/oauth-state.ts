import crypto from 'crypto';

export interface OAuthState {
  userId: string;
  timestamp: number;
  nonce: string;
  returnTo?: string;
}

export function createOAuthState(userId: string, returnTo?: string): string {
  const state: OAuthState = {
    userId,
    timestamp: Date.now(),
    nonce: crypto.randomBytes(16).toString('hex'),
    returnTo,
  };

  return Buffer.from(JSON.stringify(state)).toString('base64url');
}

export function validateOAuthState(stateString: string): { valid: boolean; userId?: string; returnTo?: string; error?: string } {
  try {
    const decoded = Buffer.from(stateString, 'base64url').toString('utf-8');
    const state: OAuthState = JSON.parse(decoded);

    if (!state.userId || !state.timestamp || !state.nonce) {
      return { valid: false, error: 'Invalid state format' };
    }

    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    if (state.timestamp < fiveMinutesAgo) {
      return { valid: false, error: 'State has expired' };
    }

    return { valid: true, userId: state.userId, returnTo: state.returnTo };
  } catch (error) {
    return { valid: false, error: 'Failed to parse state' };
  }
}
