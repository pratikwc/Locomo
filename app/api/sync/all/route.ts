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
  const averageRating = totalReviews > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / totalReviews : 0;
  const reviewResponseRate = totalReviews > 0 ? reviews.filter(r => r.reply_text).length / totalReviews : 0;
  const recentPosts = posts.filter(p => new Date(p.created_at) >= thirtyDaysAgo);
  const monthlyViews = analytics.reduce((s, a) => s + (a.views || 0), 0);
  const monthlyActions = analytics.reduce((s, a) =>
    s + (a.actions_phone || 0) + (a.actions_website || 0) + (a.actions_directions || 0), 0);
  const photoCount = Array.isArray(businessData.photos) ? businessData.photos.length : 0;

  const healthScore = calculateHealthScore({
    profileCompleteness: businessData.profile_completeness || 0,
    totalReviews, averageRating, reviewResponseRate,
    totalPosts: posts.length, recentPostsCount: recentPosts.length,
    photoCount, recentPhotosCount: 0, monthlyViews, monthlyActions,
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
    .from('health_scores').select('id').eq('business_id', businessId)
    .order('calculated_at', { ascending: false }).limit(1).maybeSingle();

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

    // Cooldown check
    const cooldownTime = new Date(Date.now() - MANUAL_SYNC_COOLDOWN_MINUTES * 60 * 1000);
    const { data: recentSync } = await supabaseAdmin
      .from('gmb_sync_sessions')
      .select('completed_at, status')
      .eq('user_id', userId)
      .gte('started_at', cooldownTime.toISOString())
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentSync?.status === 'completed') {
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
      // Fetch businesses joined with google_accounts to get gmb_account_name
      const { data: rows } = await supabaseAdmin
        .from('businesses')
        .select(`
          id, name, business_id,
          google_accounts ( gmb_account_name )
        `)
        .eq('user_id', userId);

      if (!rows || rows.length === 0) {
        await supabaseAdmin.from('gmb_sync_sessions').update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          items_processed: 0,
        }).eq('id', syncSessionId);

        return NextResponse.json({ success: true, synced: 0, message: 'No businesses found to sync' });
      }

      const accessToken = await getValidAccessToken(userId);
      if (!accessToken) {
        await supabaseAdmin.from('gmb_sync_sessions').update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          last_error: { message: 'Failed to get valid access token' },
        }).eq('id', syncSessionId);
        return NextResponse.json(
          { error: 'Failed to get valid access token', code: 'TOKEN_EXPIRED' },
          { status: 401 }
        );
      }

      let totalSynced = 0;
      const businessResults = [];

      for (const row of rows) {
        const ga = Array.isArray(row.google_accounts) ? row.google_accounts[0] : row.google_accounts;
        const gmbAccountName: string = ga?.gmb_account_name || '';

        if (!gmbAccountName) {
          console.warn(`[Sync All] No gmb_account_name for "${row.name}", skipping reviews`);
          await upsertHealthScore(row.id);
          businessResults.push({ businessId: row.id, name: row.name, synced: 0 });
          continue;
        }

        let businessSynced = 0;
        try {
          const reviews = await listReviews(accessToken, gmbAccountName, row.business_id);
          console.log(`[Sync All] ${reviews.length} reviews for "${row.name}"`);

          for (const review of reviews) {
            const rating = parseInt(review.starRating.replace('STAR_RATING_', '')) || 5;
            const sentiment: 'positive' | 'neutral' | 'negative' =
              rating >= 4 ? 'positive' : rating <= 2 ? 'negative' : 'neutral';

            const reviewData = {
              business_id: row.id,
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

            const { data: existing } = await supabaseAdmin
              .from('reviews').select('id').eq('google_review_id', reviewData.google_review_id).maybeSingle();

            if (existing) {
              await supabaseAdmin.from('reviews')
                .update({ ...reviewData, updated_at: new Date().toISOString() }).eq('id', existing.id);
            } else {
              await supabaseAdmin.from('reviews').insert(reviewData);
            }
            businessSynced++;
          }
        } catch (reviewError: any) {
          console.error(`[Sync All] Reviews failed for "${row.name}":`, reviewError.message);
          // Continue — don't let one failure block other businesses
        }

        await upsertHealthScore(row.id);
        await supabaseAdmin.from('businesses')
          .update({ last_synced_at: new Date().toISOString() }).eq('id', row.id);

        totalSynced += businessSynced;
        businessResults.push({ businessId: row.id, name: row.name, synced: businessSynced });
      }

      await supabaseAdmin.from('gmb_sync_sessions').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        items_processed: totalSynced,
      }).eq('id', syncSessionId);

      return NextResponse.json({
        success: true,
        synced: totalSynced,
        businesses: businessResults,
        message: `Successfully synced ${totalSynced} review(s) across ${businessResults.length} location(s)`,
      });

    } catch (error: any) {
      await supabaseAdmin.from('gmb_sync_sessions').update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        last_error: { message: error.message },
      }).eq('id', syncSessionId);
      throw error;
    }
  } catch (error: any) {
    console.error('[Sync All] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to sync data' }, { status: 500 });
  }
}