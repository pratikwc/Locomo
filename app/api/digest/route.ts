import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUserId } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 });

    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('id, name')
      .eq('id', businessId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    const priorWeekStart = new Date(weekStart);
    priorWeekStart.setDate(priorWeekStart.getDate() - 7);

    const weekStartStr = weekStart.toISOString();
    const priorWeekStartStr = priorWeekStart.toISOString();

    const [postsThisWeek, reviewsThisWeek, reviewsReplied, analyticsThis, analyticsPrior] = await Promise.all([
      supabaseAdmin
        .from('posts')
        .select('id, status, title, published_at')
        .eq('business_id', businessId)
        .eq('status', 'published')
        .gte('published_at', weekStartStr),
      supabaseAdmin
        .from('reviews')
        .select('id, rating, reply_status')
        .eq('business_id', businessId)
        .gte('review_date', weekStartStr),
      supabaseAdmin
        .from('reviews')
        .select('id')
        .eq('business_id', businessId)
        .eq('reply_status', 'replied')
        .gte('updated_at', weekStartStr),
      supabaseAdmin
        .from('analytics')
        .select('views, actions_phone, actions_website, actions_directions')
        .eq('business_id', businessId)
        .gte('date', weekStart.toISOString().split('T')[0]),
      supabaseAdmin
        .from('analytics')
        .select('views, actions_phone, actions_website, actions_directions')
        .eq('business_id', businessId)
        .gte('date', priorWeekStart.toISOString().split('T')[0])
        .lt('date', weekStart.toISOString().split('T')[0]),
    ]);

    const thisViews = (analyticsThis.data ?? []).reduce((s, r) => s + (r.views ?? 0), 0);
    const priorViews = (analyticsPrior.data ?? []).reduce((s, r) => s + (r.views ?? 0), 0);
    const viewsTrend = priorViews > 0
      ? parseFloat((((thisViews - priorViews) / priorViews) * 100).toFixed(1))
      : 0;

    const postsCount = postsThisWeek.data?.length ?? 0;
    const reviewsCount = reviewsThisWeek.data?.length ?? 0;
    const repliedCount = reviewsReplied.data?.length ?? 0;
    const avgRating = reviewsCount > 0
      ? parseFloat(((reviewsThisWeek.data ?? []).reduce((s, r) => s + (r.rating ?? 0), 0) / reviewsCount).toFixed(1))
      : 0;

    // Build highlights
    const highlights: string[] = [];
    if (postsCount > 0) highlights.push(`${postsCount} post${postsCount > 1 ? 's' : ''} published`);
    if (repliedCount > 0) highlights.push(`${repliedCount} review${repliedCount > 1 ? 's' : ''} replied to`);
    if (reviewsCount > 0) highlights.push(`${reviewsCount} new review${reviewsCount > 1 ? 's' : ''} received`);
    if (thisViews > 0) highlights.push(`${thisViews.toLocaleString()} profile views`);
    if (viewsTrend > 0) highlights.push(`views up ${viewsTrend}% vs last week`);

    // Top action — what should they do next
    let topAction = '';
    if (postsCount === 0) topAction = 'No posts this week — publish an update to boost visibility';
    else if (reviewsCount > repliedCount) topAction = `${reviewsCount - repliedCount} review${(reviewsCount - repliedCount) > 1 ? 's' : ''} still need a reply — respond within 24h`;
    else if (viewsTrend < 0) topAction = 'Profile views dropped — publish a post with an offer to re-engage searchers';
    else topAction = 'Great week! Keep posting consistently to maintain momentum.';

    return NextResponse.json({
      businessName: business.name,
      weekOf: weekStart.toISOString(),
      posts: { count: postsCount, items: postsThisWeek.data ?? [] },
      reviews: { received: reviewsCount, replied: repliedCount, avgRating },
      views: { thisWeek: thisViews, priorWeek: priorViews, trend: viewsTrend },
      highlights,
      topAction,
    });
  } catch (error: any) {
    console.error('[Digest] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to get digest' }, { status: 500 });
  }
}
