import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUserId } from '@/lib/auth-utils';
import { listReviews } from '@/lib/gmb-client';
import { getValidAccessToken } from '@/lib/google-token-manager';

const STAR_RATING_MAP: Record<string, number> = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
};

function parseStarRating(starRating: string): number {
  const upper = starRating.toUpperCase().replace('STAR_RATING_', '');
  const mapped = STAR_RATING_MAP[upper];
  if (mapped !== undefined) return mapped;
  return parseInt(upper) || 3;
}

async function syncReviewsForBusiness(
  business: any,
  accessToken: string
): Promise<{ synced: number; error?: string }> {
  const googleAccount = business.google_accounts;
  const gmbAccountName = googleAccount?.gmb_account_name;

  if (!gmbAccountName) {
    return { synced: 0, error: 'GMB account not configured' };
  }

  const locationName = business.business_id?.startsWith('locations/')
    ? business.business_id
    : `locations/${business.business_id}`;

  let reviews;
  try {
    reviews = await listReviews(accessToken, gmbAccountName, locationName);
  } catch (apiError: any) {
    console.error(`[Sync Reviews] GMB API error for ${business.id}:`, apiError);
    const gmbErr = apiError.gmbError;
    return { synced: 0, error: gmbErr?.userMessage || apiError.message || 'Failed to fetch reviews from Google' };
  }

  let syncedCount = 0;

  for (const review of reviews) {
    const rating = parseStarRating(review.starRating);

    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    if (rating >= 4) sentiment = 'positive';
    else if (rating <= 2) sentiment = 'negative';

    const reviewData = {
      business_id: business.id,
      google_review_id: review.reviewId,
      google_review_name: review.name,
      reviewer_name: review.reviewer.displayName,
      reviewer_photo_url: review.reviewer.profilePhotoUrl || null,
      rating,
      review_text: review.comment || null,
      review_date: new Date(review.createTime).toISOString(),
      reply_text: review.reviewReply?.comment || null,
      reply_date: review.reviewReply?.updateTime
        ? new Date(review.reviewReply.updateTime).toISOString()
        : null,
      reply_status: review.reviewReply ? 'replied' : 'pending',
      sentiment,
    };

    const { data: existingReview } = await supabaseAdmin
      .from('reviews')
      .select('id')
      .eq('google_review_id', reviewData.google_review_id)
      .maybeSingle();

    if (existingReview) {
      await supabaseAdmin
        .from('reviews')
        .update({
          ...reviewData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingReview.id);
    } else {
      await supabaseAdmin.from('reviews').insert(reviewData);
    }

    syncedCount++;
  }

  await supabaseAdmin
    .from('businesses')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('id', business.id);

  return { synced: syncedCount };
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { businessId } = body;

    const accessToken = await getValidAccessToken(userId);

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Failed to get valid access token' },
        { status: 401 }
      );
    }

    if (businessId) {
      const { data: business, error: businessError } = await supabaseAdmin
        .from('businesses')
        .select('*, google_accounts!inner(*)')
        .eq('id', businessId)
        .eq('user_id', userId)
        .single();

      if (businessError || !business) {
        return NextResponse.json({ error: 'Business not found' }, { status: 404 });
      }

      const result = await syncReviewsForBusiness(business, accessToken);

      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 502 });
      }

      return NextResponse.json({
        success: true,
        synced: result.synced,
        message: `Successfully synced ${result.synced} review(s)`,
      });
    }

    const { data: businesses, error: businessesError } = await supabaseAdmin
      .from('businesses')
      .select('*, google_accounts!inner(*)')
      .eq('user_id', userId);

    if (businessesError || !businesses || businesses.length === 0) {
      return NextResponse.json({ error: 'No businesses found' }, { status: 404 });
    }

    let totalSynced = 0;
    const errors: string[] = [];

    for (const business of businesses) {
      const result = await syncReviewsForBusiness(business, accessToken);
      totalSynced += result.synced;
      if (result.error) {
        errors.push(`${business.name}: ${result.error}`);
      }
    }

    return NextResponse.json({
      success: true,
      synced: totalSynced,
      locations: businesses.length,
      message: `Synced ${totalSynced} review(s) across ${businesses.length} location(s)`,
      ...(errors.length > 0 ? { warnings: errors } : {}),
    });
  } catch (error: any) {
    console.error('[Sync Reviews] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync reviews' },
      { status: 500 }
    );
  }
}
