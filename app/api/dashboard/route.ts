import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUserId } from '@/lib/auth-utils';
import { calculateHealthScore } from '@/lib/health-score-calculator';

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
      .select('*, google_accounts(*)')
      .eq('id', businessId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [reviewsResult, postsResult, analyticsResult, healthScoreResult] = await Promise.all([
      supabaseAdmin
        .from('reviews')
        .select('*')
        .eq('business_id', businessId)
        .order('review_date', { ascending: false }),
      supabaseAdmin
        .from('posts')
        .select('id, created_at, status')
        .eq('business_id', businessId),
      supabaseAdmin
        .from('analytics')
        .select('*')
        .eq('business_id', businessId)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false }),
      supabaseAdmin
        .from('health_scores')
        .select('*')
        .eq('business_id', businessId)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const reviews = reviewsResult.data || [];
    const posts = postsResult.data || [];
    const analytics = analyticsResult.data || [];

    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0;
    const pendingReviews = reviews.filter(r => r.reply_status === 'pending').length;
    const repliedReviews = reviews.filter(r => r.reply_status === 'replied').length;
    const reviewResponseRate = totalReviews > 0 ? repliedReviews / totalReviews : 0;

    const recentReviews = reviews.filter(r => new Date(r.review_date) >= thirtyDaysAgo);
    const recentPosts = posts.filter(p => new Date(p.created_at) >= thirtyDaysAgo);
    const publishedPosts = posts.filter(p => p.status === 'published');

    const monthlyViews = analytics.reduce((sum, a) => sum + (a.views || 0), 0);
    const monthlySearches = analytics.reduce((sum, a) => sum + (a.searches || 0), 0);
    const monthlyPhoneCalls = analytics.reduce((sum, a) => sum + (a.actions_phone || 0), 0);
    const monthlyDirections = analytics.reduce((sum, a) => sum + (a.actions_directions || 0), 0);
    const monthlyWebsiteVisits = analytics.reduce((sum, a) => sum + (a.actions_website || 0), 0);
    const monthlyBookings = analytics.reduce((sum, a) => sum + (a.actions_bookings || 0), 0);
    const monthlyActions = monthlyPhoneCalls + monthlyDirections + monthlyWebsiteVisits;

    const profileCompleteness = business.profile_completeness || 0;
    const photoCount = Array.isArray(business.photos) ? business.photos.length : 0;

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    let healthScore = healthScoreResult.data;

    if (!healthScore || new Date(healthScore.calculated_at) < oneHourAgo) {
      const fresh = calculateHealthScore({
        profileCompleteness,
        totalReviews,
        averageRating,
        reviewResponseRate,
        totalPosts: publishedPosts.length,
        recentPostsCount: recentPosts.length,
        photoCount,
        recentPhotosCount: 0,
        monthlyViews,
        monthlyActions,
      });

      const scoreRow = {
        business_id: businessId,
        score: fresh.overall,
        profile_score: fresh.profileScore,
        review_score: fresh.reviewScore,
        post_score: fresh.postScore,
        photo_score: fresh.photoScore,
        engagement_score: fresh.engagementScore,
        action_items: fresh.actionItems,
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

      healthScore = scoreRow as any;
    }

    const lastReviewDate = reviews[0]?.review_date ? new Date(reviews[0].review_date) : null;
    const daysSinceLastReview = lastReviewDate
      ? Math.floor((Date.now() - lastReviewDate.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const napScore = profileCompleteness >= 85
      ? 100
      : Math.round(profileCompleteness * 1.15);

    const ratingTrend = recentReviews.length > 0
      ? recentReviews.reduce((sum, r) => sum + r.rating, 0) / recentReviews.length
      : 0;

    const clickRate = monthlyViews > 0
      ? ((monthlyActions / monthlyViews) * 100)
      : 0;

    const searchRankingFactors = [
      {
        name: 'Keyword Match',
        score: Math.round(profileCompleteness * 0.2),
        status: profileCompleteness > 60 ? 'warning' : 'danger',
      },
      {
        name: 'Service Menu',
        score: 50,
        status: 'warning',
      },
      {
        name: 'Website Quality',
        score: business.website ? 40 : 0,
        status: business.website ? 'ok' : 'danger',
      },
      {
        name: 'Technical SEO',
        score: 28,
        status: 'danger',
      },
      {
        name: 'Online Authority',
        score: Math.min(Math.round(totalReviews * 2), 50),
        status: 'warning',
      },
      {
        name: 'Brand Mentions',
        score: 0,
        status: 'neutral',
      },
      {
        name: 'Info Consistency',
        score: napScore > 90 ? 100 : napScore,
        status: napScore > 90 ? 'excellent' : 'warning',
      },
    ];

    return NextResponse.json({
      business,
      stats: {
        napScore: Math.min(napScore, 100),
        profileCompleteness,
        averageRating,
        totalReviews,
        pendingReviews,
        repliedReviews,
        reviewResponseRate,
        daysSinceLastReview,
        totalPosts: publishedPosts.length,
        recentReviews: recentReviews.length,
        clickRate,
        monthlyViews,
        monthlySearches,
        monthlyPhoneCalls,
        monthlyDirections,
        monthlyWebsiteVisits,
        monthlyBookings,
        monthlyActions,
        photoCount,
      },
      healthScore,
      searchRankingFactors,
      recentReviews: reviews.slice(0, 5),
    });
  } catch (error: any) {
    console.error('[Dashboard] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
