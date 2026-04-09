import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth-utils';
import { callOpenAI } from '@/lib/openai';
import { supabaseAdmin } from '@/lib/supabase-admin';

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: '5min' | '30min' | '1hr' | '1day';
  category: 'profile' | 'reviews' | 'posts' | 'photos' | 'hours';
  actionLabel: string;
  actionPath?: string;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch business health data
    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('id, name, category, description, phone, website, hours, profile_completeness, last_synced_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!business) {
      return NextResponse.json({ recommendations: [] });
    }

    // Fetch review stats
    const { data: reviews } = await supabaseAdmin
      .from('reviews')
      .select('id, rating, reply_status, review_date')
      .eq('business_id', business.id);

    // Fetch recent posts
    const { data: posts } = await supabaseAdmin
      .from('posts')
      .select('id, published_at, status')
      .eq('business_id', business.id)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(5);

    const totalReviews = reviews?.length ?? 0;
    const pendingReplies = reviews?.filter(r => r.reply_status === 'pending').length ?? 0;
    const avgRating = totalReviews > 0
      ? (reviews!.reduce((s, r) => s + r.rating, 0) / totalReviews).toFixed(1)
      : '0';
    const lastPostDate = posts?.[0]?.published_at;
    const daysSincePost = lastPostDate
      ? Math.floor((Date.now() - new Date(lastPostDate).getTime()) / 86400000)
      : 999;
    const hasDescription = !!business.description;
    const hasWebsite = !!business.website;
    const hasHours = !!(business.hours?.periods?.length);

    const systemPrompt = `You are a local SEO expert. Analyse a Google Business Profile and return exactly 4 prioritised recommendations.
Return a JSON array. Each item must have:
- title: string (max 8 words, imperative)
- description: string (1-2 sentences explaining why and what to do)
- impact: "high" | "medium" | "low"
- effort: "5min" | "30min" | "1hr" | "1day"
- category: "profile" | "reviews" | "posts" | "photos" | "hours"
- actionLabel: string (3-4 words, e.g. "Reply to reviews")

Order by impact descending. Return only valid JSON array, no markdown.`;

    const userPrompt = `Business: ${business.name} (${business.category || 'local business'})
Profile completeness: ${business.profile_completeness ?? 0}%
Has description: ${hasDescription}
Has website: ${hasWebsite}
Has business hours: ${hasHours}
Total reviews: ${totalReviews}
Average rating: ${avgRating}
Pending review replies: ${pendingReplies}
Days since last post: ${daysSincePost === 999 ? 'never posted' : daysSincePost}

Generate 4 high-value recommendations to improve this business profile's local ranking.`;

    const raw = await callOpenAI(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.5, maxTokens: 600 }
    );

    let recs: Omit<Recommendation, 'id'>[];
    try {
      const match = raw.match(/\[[\s\S]*\]/);
      recs = JSON.parse(match ? match[0] : raw);
    } catch {
      recs = getStaticRecommendations(pendingReplies, daysSincePost, hasDescription, business.profile_completeness ?? 0);
    }

    const recommendations: Recommendation[] = recs.slice(0, 4).map((r, i) => ({
      ...r,
      id: `rec-${i}`,
      actionPath: getCategoryPath(r.category),
    }));

    return NextResponse.json({ recommendations });
  } catch (error: any) {
    console.error('[Recommendations] Error:', error);
    return NextResponse.json({ recommendations: [] });
  }
}

function getCategoryPath(category: string): string {
  const map: Record<string, string> = {
    reviews: '/dashboard/reviews',
    posts: '/dashboard/posts',
    profile: '/dashboard/profile',
    photos: '/dashboard/profile',
    hours: '/dashboard/profile',
  };
  return map[category] ?? '/dashboard';
}

function getStaticRecommendations(
  pendingReplies: number,
  daysSincePost: number,
  hasDescription: boolean,
  completeness: number
): Omit<Recommendation, 'id'>[] {
  const recs: Omit<Recommendation, 'id'>[] = [];

  if (pendingReplies > 0) {
    recs.push({
      title: `Reply to ${pendingReplies} pending review${pendingReplies > 1 ? 's' : ''}`,
      description: 'Responding to reviews boosts your ranking and shows customers you care. Google rewards high response rates.',
      impact: 'high',
      effort: '30min',
      category: 'reviews',
      actionLabel: 'Reply to reviews',
    });
  }
  if (daysSincePost > 7) {
    recs.push({
      title: 'Publish a new business post',
      description: 'Businesses that post weekly get 2x more views. Share an offer, update, or event to stay visible.',
      impact: 'high',
      effort: '5min',
      category: 'posts',
      actionLabel: 'Create a post',
    });
  }
  if (!hasDescription) {
    recs.push({
      title: 'Add a business description',
      description: 'A keyword-rich description helps Google match your business to relevant searches.',
      impact: 'medium',
      effort: '30min',
      category: 'profile',
      actionLabel: 'Edit profile',
    });
  }
  if (completeness < 80) {
    recs.push({
      title: 'Complete your business profile',
      description: `Your profile is ${completeness}% complete. Profiles with 100% completeness get 7x more clicks.`,
      impact: 'medium',
      effort: '1hr',
      category: 'profile',
      actionLabel: 'Complete profile',
    });
  }

  while (recs.length < 4) {
    recs.push({
      title: 'Add more photos to your profile',
      description: 'Businesses with 10+ photos get 35% more clicks. Add interior, exterior, and product photos.',
      impact: 'medium',
      effort: '30min',
      category: 'photos',
      actionLabel: 'Add photos',
    });
  }

  return recs.slice(0, 4);
}
