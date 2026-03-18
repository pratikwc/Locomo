import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { getAuthenticatedUserId } from '@/lib/auth-utils';
import { replyToReview } from '@/lib/gmb-client';
import { getValidAccessToken } from '@/lib/google-token-manager';

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');

    const { data: userBusinesses, error: bizError } = await supabase
      .from('businesses')
      .select('id, name')
      .eq('user_id', userId);

    if (bizError || !userBusinesses || userBusinesses.length === 0) {
      return NextResponse.json({ reviews: [], businesses: [] });
    }

    const businessMap: Record<string, string> = {};
    userBusinesses.forEach(b => { businessMap[b.id] = b.name; });

    const allowedIds = userBusinesses.map(b => b.id);

    let query = supabase
      .from('reviews')
      .select('*')
      .in('business_id', allowedIds)
      .order('review_date', { ascending: false });

    if (businessId && allowedIds.includes(businessId)) {
      query = supabase
        .from('reviews')
        .select('*')
        .eq('business_id', businessId)
        .order('review_date', { ascending: false });
    }

    const { data: reviews, error: reviewsError } = await query;

    if (reviewsError) {
      throw new Error(reviewsError.message);
    }

    const reviewsWithLocation = (reviews || []).map(r => ({
      ...r,
      business_name: businessMap[r.business_id] || 'Unknown Location',
    }));

    return NextResponse.json({
      reviews: reviewsWithLocation,
      businesses: userBusinesses,
    });
  } catch (error: any) {
    console.error('[Get Reviews] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reviewId, replyText, businessId } = await request.json();

    if (!reviewId || !replyText || !businessId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', businessId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const { data: review } = await supabase
      .from('reviews')
      .select('id, business_id, google_review_name')
      .eq('id', reviewId)
      .eq('business_id', businessId)
      .maybeSingle();

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    const { error: updateError } = await supabase
      .from('reviews')
      .update({
        reply_text: replyText,
        reply_status: 'replied',
        reply_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', reviewId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    if (review.google_review_name) {
      const accessToken = await getValidAccessToken(userId);
      if (accessToken) {
        await replyToReview(accessToken, review.google_review_name, replyText);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Save Reply] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save reply' },
      { status: 500 }
    );
  }
}
