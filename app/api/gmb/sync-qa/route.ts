import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUserId } from '@/lib/auth-utils';
import { getValidAccessToken } from '@/lib/google-token-manager';
import { listQuestions } from '@/lib/gmb-client';
import { callOpenAI } from '@/lib/openai';

async function generateAnswer(
  businessName: string,
  question: string,
  category: string | null
): Promise<string> {
  const raw = await callOpenAI([
    {
      role: 'system',
      content: `You are a helpful business owner answering a customer's question on Google Maps.
Be friendly, helpful, and concise (2-4 sentences max). Don't start with "Great question!".
Return only the answer text, no JSON.`,
    },
    {
      role: 'user',
      content: `Business: ${businessName} (${category || 'local business'})
Customer question: ${question}
Write a helpful answer.`,
    },
  ], { temperature: 0.7, maxTokens: 200 });
  return raw.trim();
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { businessId } = await request.json();
    if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 });

    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('id, user_id, name, category, business_id, google_account_id')
      .eq('id', businessId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    const accessToken = await getValidAccessToken(userId);
    if (!accessToken) return NextResponse.json({ error: 'No valid access token' }, { status: 401 });

    const { data: googleAccount } = await supabaseAdmin
      .from('google_accounts')
      .select('gmb_account_name')
      .eq('id', business.google_account_id)
      .maybeSingle();

    if (!googleAccount?.gmb_account_name) {
      return NextResponse.json({ error: 'No GMB account name' }, { status: 400 });
    }

    let locationPath: string;
    if (business.business_id.startsWith('accounts/')) {
      locationPath = business.business_id;
    } else {
      const accountId = googleAccount.gmb_account_name.replace('accounts/', '');
      const locationId = business.business_id.replace('locations/', '');
      locationPath = `accounts/${accountId}/locations/${locationId}`;
    }

    const questions = await listQuestions(accessToken, locationPath);
    let synced = 0;
    let drafted = 0;

    for (const q of questions) {
      const hasOwnerAnswer = q.topAnswers?.some(a => a.author.type === 'MERCHANT');

      const { data: existing } = await supabaseAdmin
        .from('qa_items')
        .select('id, answer_status')
        .eq('business_id', businessId)
        .eq('google_question_id', q.name)
        .maybeSingle();

      if (existing) {
        // Update question text/count in case it changed
        await supabaseAdmin
          .from('qa_items')
          .update({ question_text: q.text, upvote_count: q.upvoteCount, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        synced++;
        continue;
      }

      // New question — generate draft answer
      let aiAnswer: string | null = null;
      if (!hasOwnerAnswer) {
        try {
          aiAnswer = await generateAnswer(business.name, q.text, business.category);
          drafted++;
        } catch { /* non-critical */ }
      }

      await supabaseAdmin.from('qa_items').insert({
        business_id: businessId,
        google_question_id: q.name,
        question_text: q.text,
        question_author: q.author.displayName,
        upvote_count: q.upvoteCount,
        answer_status: hasOwnerAnswer ? 'posted' : aiAnswer ? 'draft' : 'pending',
        ai_answer: aiAnswer,
        asked_at: q.createTime,
      });
      synced++;
    }

    return NextResponse.json({ success: true, synced, drafted });
  } catch (error: any) {
    console.error('[Sync QA] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to sync Q&A' }, { status: 500 });
  }
}
