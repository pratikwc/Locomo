import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUserId } from '@/lib/auth-utils';
import { getValidAccessToken } from '@/lib/google-token-manager';

/**
 * GET /api/debug/reviews
 * Diagnostic endpoint — tests every possible GMB reviews URL format
 * and returns results so we can see exactly what Google returns.
 * Remove this file after debugging.
 */
export async function GET(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) return NextResponse.json({ error: 'No valid access token' }, { status: 401 });

  // Get this user's business + account info
  const { data: rows } = await supabaseAdmin
    .from('businesses')
    .select('id, name, business_id, google_accounts(gmb_account_name, google_user_id, email)')
    .eq('user_id', userId)
    .limit(1);

  if (!rows?.length) return NextResponse.json({ error: 'No businesses found' });

  const row = rows[0];
  const ga: any = Array.isArray(row.google_accounts) ? row.google_accounts[0] : row.google_accounts;
  const gmbAccountName: string = ga?.gmb_account_name || '';
  const googleUserId: string = ga?.google_user_id || '';
  const businessId: string = row.business_id || '';

  // Extract numeric IDs
  const accountId = gmbAccountName.replace('accounts/', '');
  const locationId = businessId.replace('locations/', '');

  async function tryUrl(label: string, url: string) {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      let body: any;
      try { body = await res.json(); } catch { body = await res.text(); }
      return {
        label,
        url,
        status: res.status,
        ok: res.ok,
        reviewCount: body?.reviews?.length ?? null,
        // Show first 500 chars of body if no reviews key
        preview: body?.reviews ? `${body.reviews.length} reviews` : JSON.stringify(body).slice(0, 300),
      };
    } catch (e: any) {
      return { label, url, status: 0, ok: false, error: e.message };
    }
  }

  const results = await Promise.all([
    // Token validity check
    tryUrl('Token check', 'https://www.googleapis.com/oauth2/v2/userinfo'),

    // List GMB accounts (to find the REAL account ID)
    tryUrl('List accounts', 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts'),

    // v4 with stored account ID
    tryUrl(
      `v4 accounts/${accountId}/locations/${locationId}/reviews`,
      `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews?pageSize=10`
    ),

    // mybusinessreviews v1 with stored account ID  
    tryUrl(
      `mybusinessreviews v1 accounts/${accountId}/locations/${locationId}/reviews`,
      `https://mybusinessreviews.googleapis.com/v1/accounts/${accountId}/locations/${locationId}/reviews?pageSize=10`
    ),

    // Try with google_user_id directly if different from accountId
    ...(googleUserId && googleUserId !== accountId ? [
      tryUrl(
        `v4 with google_user_id accounts/${googleUserId}/locations/${locationId}/reviews`,
        `https://mybusiness.googleapis.com/v4/accounts/${googleUserId}/locations/${locationId}/reviews?pageSize=10`
      ),
    ] : []),
  ]);

  return NextResponse.json({
    debug: {
      userId,
      businessName: row.name,
      businessId,
      gmbAccountName,
      googleUserId,
      accountId,
      locationId,
    },
    results,
  }, { status: 200 });
}