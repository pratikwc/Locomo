import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthenticatedUserId } from '@/lib/auth-utils';
import { listReviews } from '@/lib/gmb-client';
import { getValidAccessToken } from '@/lib/google-token-manager';

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { businessId } = await request.json();

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('*, google_accounts!inner(*)')
      .eq('id', businessId)
      .eq('user_id', userId)
      .single();

    if (businessError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const googleAccount = business.google_accounts;
    const gmbAccountName = googleAccount.gmb_account_name;

    if (!gmbAccountName) {
      return NextResponse.json({ error: 'GMB account not configured' }, { status: 400 });
    }

    // Check sync cooldown (5 minutes)
    const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
    if (googleAccount.last_reviews_sync_at) {
      const lastSyncTime = new Date(googleAccount.last_reviews_sync_at).getTime();
      const now = Date.now();
      const timeSinceLastSync = now - lastSyncTime;

      if (timeSinceLastSync < COOLDOWN_MS) {
        const remainingMs = COOLDOWN_MS - timeSinceLastSync;
        const remainingMinutes = Math.ceil(remainingMs / 60000);
        const remainingSeconds = Math.ceil(remainingMs / 1000);

        return NextResponse.json(
          {
            error: 'sync_cooldown',
            message: `Please wait ${remainingMinutes} minute(s) before syncing reviews again`,
            retryAfter: remainingMs,
            remainingSeconds,
            lastSyncedAt: googleAccount.last_reviews_sync_at,
          },
          { status: 429 }
        );
      }
    }

    const accessToken = await getValidAccessToken(userId);

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Failed to get valid access token' },
        { status: 401 }
      );
    }

    const reviews = await listReviews(
      accessToken,
      gmbAccountName,
      business.business_id
    );

    let syncedCount = 0;

    for (const review of reviews) {
      const reviewData = {
        business_id: businessId,
        google_review_id: review.reviewId,
        reviewer_name: review.reviewer.displayName,
        reviewer_photo_url: review.reviewer.profilePhotoUrl || null,
        rating: parseInt(review.starRating.replace('STAR_RATING_', '')) || 5,
        review_text: review.comment || null,
        review_date: new Date(review.createTime).toISOString(),
        reply_text: review.reviewReply?.comment || null,
        reply_date: review.reviewReply?.updateTime
          ? new Date(review.reviewReply.updateTime).toISOString()
          : null,
        reply_status: review.reviewReply ? 'replied' : 'pending',
      };

      const { data: existingReview } = await supabase
        .from('reviews')
        .select('id')
        .eq('google_review_id', reviewData.google_review_id)
        .maybeSingle();

      if (existingReview) {
        await supabase
          .from('reviews')
          .update({
            ...reviewData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingReview.id);
      } else {
        await supabase.from('reviews').insert(reviewData);
      }

      syncedCount++;
    }

    await supabase
      .from('businesses')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', businessId);

    // Update sync timestamp and counter
    await supabase
      .from('google_accounts')
      .update({
        last_reviews_sync_at: new Date().toISOString(),
        reviews_sync_count: (googleAccount.reviews_sync_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', googleAccount.id);

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      message: `Successfully synced ${syncedCount} review(s)`,
    });
  } catch (error: any) {
    console.error('[Sync Reviews] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync reviews' },
      { status: 500 }
    );
  }
}
