import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUserId } from '@/lib/auth-utils';
import { listReviews } from '@/lib/gmb-client';
import { getValidAccessToken } from '@/lib/google-token-manager';
import { calculateHealthScore } from '@/lib/health-score-calculator';

const MANUAL_SYNC_COOLDOWN_MINUTES = 5;

async function upsertHealthScore(businessId: string): Promise<void> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [reviewsResult, postsResult, analyticsResult, businessResult] = await Promise.all([
    supabaseAdmin.from('reviews').select('rating, reply_text').eq('business_id', businessId),
    supabaseAdmin.from('posts').select('created_at').eq('business_id', businessId).eq('status', 'published'),
    supabaseAdmin.from('analytics')
      .select('views, actions_phone, actions_website, actions_directions')
      .eq('business_id', businessId)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0]),
    supabaseAdmin.from('businesses').select('profile_completeness, photos').eq('id', businessId).maybeSingle(),
  ]);

  const businessData = businessResult.data;
  if (!businessData) return;

  const reviews = reviewsResult.data || [];
  const posts = postsResult.data || [];
  const analytics = analyticsResult.data || [];

  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
    : 0;
  const reviewsWithReplies = reviews.filter(r => r.reply_text).length;
  const reviewResponseRate = totalReviews > 0 ? reviewsWithReplies / totalReviews : 0;
  const recentPosts = posts.filter(p => new Date(p.created_at) >= thirtyDaysAgo);
  const monthlyViews = analytics.reduce((sum, a) => sum + (a.views || 0), 0);
  const monthlyActions = analytics.reduce((sum, a) =>
    sum + (a.actions_phone || 0) + (a.actions_website || 0) + (a.actions_directions || 0), 0
  );
  const photoCount = Array.isArray(businessData.photos) ? businessData.photos.length : 0;

  const healthScore = calculateHealthScore({
    profileCompleteness: businessData.profile_completeness || 0,
    totalReviews,
    averageRating,
    reviewResponseRate,
    totalPosts: posts.length,
    recentPostsCount: recentPosts.length,
    photoCount,
    recentPhotosCount: 0,
    monthlyViews,
    monthlyActions,
  });

  const scoreRow = {
    business_id: businessId,
    score: healthScore.overall,
    profile_score: healthScore.profileScore,
    review_score: healthScore.reviewScore,
    post_score: healthScore.postScore,
    photo_score: healthScore.photoScore,
    engagement_score: healthScore.engagementScore,
    action_items: healthScore.actionItems,
    calculated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabaseAdmin
  .from('health_scores')
  .select('id')
  .eq('business_id', businessId)
  .order('calculated_at', { ascending: false })
  .limit(1)
  .maybeSingle();

if (existing) {
  await supabaseAdmin.from('health_scores').update(scoreRow).eq('id', existing.id);
} else {
  await supabaseAdmin.from('health_scores').insert(scoreRow);
}
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cooldownTime = new Date(Date.now() - MANUAL_SYNC_COOLDOWN_MINUTES * 60 * 1000);

    const { data: recentSync } = await supabaseAdmin
      .from('gmb_sync_sessions')
      .select('completed_at, status')
      .eq('user_id', userId)
      .gte('started_at', cooldownTime.toISOString())
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentSync && recentSync.status === 'completed') {
      return NextResponse.json({
        error: 'Please wait before syncing again',
        retryAfter: MANUAL_SYNC_COOLDOWN_MINUTES * 60,
      }, { status: 429 });
    }

    const syncSessionId = crypto.randomUUID();
    await supabaseAdmin.from('gmb_sync_sessions').insert({
      id: syncSessionId,
      user_id: userId,
      status: 'running',
      started_at: new Date().toISOString(),
    });

    try {
      const { data: businesses } = await supabaseAdmin
        .from('businesses')
        .select('id, business_id, google_accounts!inner(gmb_account_name)')
        .eq('user_id', userId);

      if (!businesses || businesses.length === 0) {
        await supabaseAdmin
          .from('gmb_sync_sessions')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            items_processed: 0,
          })
          .eq('id', syncSessionId);

        return NextResponse.json({
          success: true,
          synced: 0,
          message: 'No businesses found to sync',
        });
      }

      const accessToken = await getValidAccessToken(userId);
      if (!accessToken) {
        throw new Error('Failed to get valid access token');
      }

      let totalSynced = 0;
      const businessResults = [];

      for (const business of businesses) {
        const googleAccount = Array.isArray(business.google_accounts)
  ? business.google_accounts[0]
  : business.google_accounts;

if (!googleAccount) {
  console.log(`[Sync All] No google_account linked for business ${business.id}, skipping`);
  continue;
}

        const gmbAccountName = googleAccount?.gmb_account_name;

        if (!gmbAccountName) {
          console.log(`[Sync All] No gmb_account_name for business ${business.id}, skipping reviews`);
        }

        let businessSynced = 0;

        if (gmbAccountName) {
          const reviews = await listReviews(
            accessToken,
            gmbAccountName,
            business.business_id
          );

          console.log(`[Sync All] Fetched ${reviews.length} reviews for business ${business.id}`);

          for (const review of reviews) {
            const rating = parseInt(review.starRating.replace('STAR_RATING_', '')) || 5;

            let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
            if (rating >= 4) sentiment = 'positive';
            else if (rating <= 2) sentiment = 'negative';

            const reviewData = {
              business_id: business.id,
              google_review_id: review.reviewId,
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
                .update({ ...reviewData, updated_at: new Date().toISOString() })
                .eq('id', existingReview.id);
            } else {
              await supabaseAdmin.from('reviews').insert(reviewData);
            }

            businessSynced++;
          }
        }

        await upsertHealthScore(business.id);

        await supabaseAdmin
          .from('businesses')
          .update({ last_synced_at: new Date().toISOString() })
          .eq('id', business.id);

        totalSynced += businessSynced;
        businessResults.push({ businessId: business.id, synced: businessSynced });
      }

      await supabaseAdmin
        .from('gmb_sync_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          items_processed: totalSynced,
        })
        .eq('id', syncSessionId);

      return NextResponse.json({
        success: true,
        synced: totalSynced,
        businesses: businessResults,
        message: `Successfully synced ${totalSynced} items`,
      });
    } catch (error: any) {
      await supabaseAdmin
        .from('gmb_sync_sessions')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          last_error: { message: error.message },
        })
        .eq('id', syncSessionId);

      throw error;
    }
  } catch (error: any) {
    console.error('[Sync All] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync data' },
      { status: 500 }
    );
  }
}
