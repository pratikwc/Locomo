import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth-utils';
import { callOpenAI } from '@/lib/openai';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { businessId, postType = 'STANDARD', prompt } = await request.json();

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    // Fetch business details to personalise the post
    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('name, category, description, address')
      .eq('id', businessId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const postTypeInstructions: Record<string, string> = {
      STANDARD: 'Write a general business update or announcement.',
      OFFER: 'Write about a special offer or promotion. Include a clear discount or benefit.',
      EVENT: 'Write about an upcoming event. Include what, when, and why to attend.',
    };

    const systemPrompt = `You are a local business marketing expert writing a Google Business Profile post.
Posts should be engaging, local, and drive customer action.
Keep posts under 300 words. Use a friendly, professional tone.
Return a JSON object with exactly two fields: "title" (5-8 words) and "content" (the post body, no title repeated).
Return only valid JSON, no markdown.`;

    const userPrompt = `Business Name: ${business.name}
Category: ${business.category || 'local business'}
Description: ${business.description || 'Not provided'}
Post Type: ${postType}
Task: ${postTypeInstructions[postType] || postTypeInstructions.STANDARD}
${prompt ? `Additional instructions: ${prompt}` : ''}`;

    const raw = await callOpenAI(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.8, maxTokens: 400 }
    );

    let parsed: { title: string; content: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Attempt to extract JSON from the response
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { title: 'New Update', content: raw };
    }

    return NextResponse.json({ title: parsed.title, content: parsed.content });
  } catch (error: any) {
    console.error('[Generate Post] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate post' }, { status: 500 });
  }
}
