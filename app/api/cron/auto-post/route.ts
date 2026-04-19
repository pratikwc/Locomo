import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getValidAccessToken } from '@/lib/google-token-manager';
import { createLocalPost } from '@/lib/gmb-client';
import { callOpenAI } from '@/lib/openai';
import { getKeywordsForCategory } from '@/lib/keyword-library';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function todayName(): string {
  return DAYS[new Date().getDay()];
}

function weeksSinceDate(date: string | null): number {
  if (!date) return 999;
  const diff = Date.now() - new Date(date).getTime();
  return diff / (7 * 24 * 60 * 60 * 1000);
}

async function generatePostContent(
  businessName: string,
  category: string | null,
  description: string | null,
  postType: string,
  tone: string,
  topics: string[]
): Promise<{ title: string; content: string }> {
  const keywords = getKeywordsForCategory(category, 3);
  const postTypeInstructions: Record<string, string> = {
    STANDARD: 'Write a general business update or announcement.',
    OFFER: 'Write about a special offer or promotion with a clear benefit.',
    EVENT: 'Write about an upcoming event — what, when, why to attend.',
  };
  const toneInstructions: Record<string, string> = {
    friendly: 'Use a warm, conversational tone.',
    professional: 'Use a polished, professional tone.',
    enthusiastic: 'Use an energetic, exciting tone.',
  };

  const raw = await callOpenAI([
    {
      role: 'system',
      content: `You are a local business marketing expert writing a Google Business Profile post.
${toneInstructions[tone] || toneInstructions.friendly}
Keep posts under 300 words. Naturally weave in 2-3 provided keywords.
Return valid JSON only: {"title":"5-8 words","content":"post body"}`,
    },
    {
      role: 'user',
      content: `Business: ${businessName}
Category: ${category || 'local business'}
Description: ${description || ''}
Post Type: ${postType}
Task: ${postTypeInstructions[postType] || postTypeInstructions.STANDARD}
Keywords: ${keywords.join(', ')}
${topics.length ? `Focus topics: ${topics.join(', ')}` : ''}`,
    },
  ], { temperature: 0.85, maxTokens: 400 });

  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : { title: 'Weekly Update', content: raw };
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'dev-secret';
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = todayName();

    // Find all enabled autopilot configs where today is a preferred posting day
    const { data: configs } = await supabaseAdmin
      .from('autopilot_configs')
      .select('*, businesses!inner(id, user_id, name, category, description, business_id, google_account_id)')
      .eq('enabled', true);

    if (!configs?.length) {
      return NextResponse.json({ success: true, posted: 0, message: 'No active autopilot configs' });
    }

    let posted = 0;
    const results: any[] = [];

    for (const config of configs) {
      const business = (config as any).businesses;
      if (!business) continue;

      // Check if today is a preferred day
      if (!config.preferred_days.includes(today)) continue;

      // Check posts_per_week limit — count posts published this week
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // start of week (Sunday)
      const { count: postsThisWeek } = await supabaseAdmin
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', business.id)
        .eq('status', 'published')
        .gte('published_at', weekStart.toISOString());

      if ((postsThisWeek ?? 0) >= config.posts_per_week) continue;

      // Check we haven't already posted today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count: postedToday } = await supabaseAdmin
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', business.id)
        .eq('status', 'published')
        .gte('published_at', todayStart.toISOString());

      if ((postedToday ?? 0) > 0) continue;

      const accessToken = await getValidAccessToken(business.user_id);
      if (!accessToken) {
        results.push({ businessId: business.id, error: 'No valid access token' });
        continue;
      }

      // Rotate post type — pick from config.post_types
      const typeIndex = (postsThisWeek ?? 0) % config.post_types.length;
      const postType = config.post_types[typeIndex] || 'STANDARD';

      // Get GMB account name
      const { data: googleAccount } = await supabaseAdmin
        .from('google_accounts')
        .select('gmb_account_name')
        .eq('id', business.google_account_id)
        .maybeSingle();

      if (!googleAccount?.gmb_account_name) {
        results.push({ businessId: business.id, error: 'No GMB account name' });
        continue;
      }

      // Build location path
      let locationPath: string;
      if (business.business_id.startsWith('accounts/')) {
        locationPath = business.business_id;
      } else {
        const accountId = googleAccount.gmb_account_name.replace('accounts/', '');
        const locationId = business.business_id.replace('locations/', '');
        locationPath = `accounts/${accountId}/locations/${locationId}`;
      }

      // Generate content
      let generated: { title: string; content: string };
      try {
        generated = await generatePostContent(
          business.name,
          business.category,
          business.description,
          postType,
          config.tone,
          config.topics
        );
      } catch (err: any) {
        results.push({ businessId: business.id, error: `AI generation failed: ${err.message}` });
        continue;
      }

      // Publish to GMB
      const gmbPost = await createLocalPost(accessToken, locationPath, {
        topicType: postType as 'STANDARD' | 'OFFER' | 'EVENT',
        summary: generated.content,
      });

      if (!gmbPost) {
        results.push({ businessId: business.id, error: 'GMB publish failed' });
        continue;
      }

      const now = new Date().toISOString();

      // Save post record
      await supabaseAdmin.from('posts').insert({
        business_id: business.id,
        title: generated.title,
        content: generated.content,
        status: 'published',
        published_at: now,
        google_post_id: gmbPost.name,
        post_type: postType,
        ai_generated: true,
        ai_prompt: 'autopilot',
      });

      // Update last_auto_post_at
      await supabaseAdmin
        .from('autopilot_configs')
        .update({ last_auto_post_at: now, updated_at: now })
        .eq('id', config.id);

      posted++;
      results.push({ businessId: business.id, success: true, postType, title: generated.title });
    }

    return NextResponse.json({ success: true, posted, results });
  } catch (error: any) {
    console.error('[Auto Post Cron] Error:', error);
    return NextResponse.json({ error: error.message || 'Auto-post failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
