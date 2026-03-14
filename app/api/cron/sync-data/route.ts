import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { listReviews, listBusinessLocations, getBusinessInfo, getLocationInsights } from '@/lib/gmb-client';
import { getValidAccessToken } from '@/lib/google-token-manager';
import { calculateHealthScore } from '@/lib/health-score-calculator';

const SYNC_COOLDOWN_MINUTES = 15;

async function canSync(userId: string, syncType: string): Promise<boolean> {
  const cooldownTime = new Date(Date.now() - SYNC_COOLDOWN_MINUTES * 60 * 1000);

  const { data: recentSync } = await supabase
    .from('gmb_sync_sessions')
    .select('completed_at')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .gte('completed_at', cooldownTime.toISOString())
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return !recentSync;
}

async function syncBusinessReviews(businessId: string, userId: string): Promise<number> {
  const { data: business } = await supabase
    .from('businesses')
    .select('*, google_accounts!inner(*)')
    .eq('id', businessId)
    .maybeSingle();

  if (!business || !business.google_accounts) {
    return 0;
  }

  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) {
    return 0;
  }

  const googleAccount = business.google_accounts;
  const gmbAccountName = googleAccount.gmb_account_name;

  if (!gmbAccountName) {
    return 0;
  }

  const reviews = await listReviews(
    accessToken,
    gmbAccountName,
    business.business_id
  );

  let syncedCount = 0;

  for (const review of reviews) {
    const rating = parseInt(review.starRating.replace('STAR_RATING_', '')) || 5;

    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    if (rating >= 4) sentiment = 'positive';
    else if (rating <= 2) sentiment = 'negative';

    const reviewData = {
      business_id: businessId,
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

  return syncedCount;
}

async function syncBusinessAnalytics(businessId: string, userId: string): Promise<void> {
  const { data: business } = await supabase
    .from('businesses')
    .select('business_id, google_accounts!inner(*)')
    .eq('id', businessId)
    .maybeSingle();

  if (!business || !business.google_accounts) {
    return;
  }

  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) {
    return;
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const startDate = thirtyDaysAgo.toISOString().split('T')[0];
  const endDate = new Date().toISOString().split('T')[0];

  const insights = await getLocationInsights(
    accessToken,
    business.business_id,
    startDate,
    endDate
  );

  for (const insight of insights) {
    const analyticsData = {
      business_id: businessId,
      date: insight.date,
      views: insight.views,
      searches: insight.searches,
      actions_phone: insight.actionsPhone,
      actions_website: insight.actionsWebsite,
      actions_directions: insight.actionsDirections,
    };

    const { data: existing } = await supabase
      .from('analytics')
      .select('id')
      .eq('business_id', businessId)
      .eq('date', insight.date)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('analytics')
        .update(analyticsData)
        .eq('id', existing.id);
    } else {
      await supabase.from('analytics').insert(analyticsData);
    }
  }
}

async function calculateAndStoreHealthScore(businessId: string): Promise<void> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: reviews } = await supabase
    .from('reviews')
    .select('rating, reply_text')
    .eq('business_id', businessId);

  const { data: posts } = await supabase
    .from('posts')
    .select('created_at, status')
    .eq('business_id', businessId)
    .eq('status', 'published');

  const { data: analytics } = await supabase
    .from('analytics')
    .select('views, actions_phone, actions_website, actions_directions')
    .eq('business_id', businessId)
    .gte('date', thirtyDaysAgo.toISOString());

  const { data: business } = await supabase
    .from('businesses')
    .select('profile_completeness, photos')
    .eq('id', businessId)
    .maybeSingle();

  if (!business) return;

  const totalReviews = reviews?.length || 0;
  const averageRating = totalReviews > 0
    ? reviews!.reduce((sum, r) => sum + r.rating, 0) / totalReviews
    : 0;
  const reviewsWithReplies = reviews?.filter(r => r.reply_text)?.length || 0;
  const reviewResponseRate = totalReviews > 0 ? reviewsWithReplies / totalReviews : 0;

  const recentPosts = posts?.filter(p => {
    const postDate = new Date(p.created_at);
    return postDate >= thirtyDaysAgo;
  }) || [];

  const monthlyViews = analytics?.reduce((sum, a) => sum + (a.views || 0), 0) || 0;
  const monthlyActions = analytics?.reduce((sum, a) =>
    sum + (a.actions_phone || 0) + (a.actions_website || 0) + (a.actions_directions || 0), 0
  ) || 0;

  const photoCount = business.photos?.length || 0;
  const recentPhotos = 0;

  const healthScore = calculateHealthScore({
    profileCompleteness: business.profile_completeness || 0,
    totalReviews,
    averageRating,
    reviewResponseRate,
    totalPosts: posts?.length || 0,
    recentPostsCount: recentPosts.length,
    photoCount,
    recentPhotosCount: recentPhotos,
    monthlyViews,
    monthlyActions,
  });

  await supabase.from('health_scores').insert({
    business_id: businessId,
    score: healthScore.overall,
    profile_score: healthScore.profileScore,
    review_score: healthScore.reviewScore,
    post_score: healthScore.postScore,
    photo_score: healthScore.photoScore,
    engagement_score: healthScore.engagementScore,
    action_items: healthScore.actionItems,
    calculated_at: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'dev-secret';

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: googleAccounts } = await supabase
      .from('google_accounts')
      .select('user_id, gmb_account_name')
      .eq('has_gmb_access', true);

    if (!googleAccounts || googleAccounts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No accounts to sync',
      });
    }

    let totalSynced = 0;
    const results = [];

    for (const account of googleAccounts) {
      const userId = account.user_id;

      if (!userId || !(await canSync(userId, 'reviews'))) {
        continue;
      }

      const syncSessionId = crypto.randomUUID();
      await supabase.from('gmb_sync_sessions').insert({
        id: syncSessionId,
        user_id: userId,
        status: 'running',
        started_at: new Date().toISOString(),
      });

      try {
        const { data: businesses } = await supabase
          .from('businesses')
          .select('id')
          .eq('user_id', userId);

        let userSynced = 0;

        if (businesses) {
          for (const business of businesses) {
            const reviewCount = await syncBusinessReviews(business.id, userId);
            userSynced += reviewCount;

            await syncBusinessAnalytics(business.id, userId);

            await calculateAndStoreHealthScore(business.id);

            await supabase
              .from('businesses')
              .update({ last_synced_at: new Date().toISOString() })
              .eq('id', business.id);
          }
        }

        await supabase
          .from('gmb_sync_sessions')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            items_processed: userSynced,
          })
          .eq('id', syncSessionId);

        totalSynced += userSynced;
        results.push({ userId, synced: userSynced });
      } catch (error: any) {
        await supabase
          .from('gmb_sync_sessions')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            last_error: { message: error.message },
          })
          .eq('id', syncSessionId);
      }
    }

    return NextResponse.json({
      success: true,
      totalSynced,
      results,
      message: `Synced ${totalSynced} items across ${results.length} accounts`,
    });
  } catch (error: any) {
    console.error('[Cron Sync] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync data' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
