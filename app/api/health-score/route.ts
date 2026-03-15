import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUserId } from '@/lib/auth-utils';
import { calculateHealthScore } from '@/lib/health-score-calculator';

async function computeAndStoreHealthScore(businessId: string): Promise<any> {
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
  if (!businessData) return null;

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

  return scoreRow;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('id', businessId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const { data: healthScore } = await supabaseAdmin
      .from('health_scores')
      .select('*')
      .eq('business_id', businessId)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!healthScore || new Date(healthScore.calculated_at) < oneHourAgo) {
      const freshScore = await computeAndStoreHealthScore(businessId);
      return NextResponse.json({ healthScore: freshScore });
    }

    return NextResponse.json({ healthScore });
  } catch (error: any) {
    console.error('[Health Score] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch health score' },
      { status: 500 }
    );
  }
}
