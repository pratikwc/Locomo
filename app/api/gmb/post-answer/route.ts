import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUserId } from '@/lib/auth-utils';
import { getValidAccessToken } from '@/lib/google-token-manager';
import { upsertAnswer } from '@/lib/gmb-client';

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { qaItemId, answerText } = await request.json();
    if (!qaItemId || !answerText?.trim()) {
      return NextResponse.json({ error: 'qaItemId and answerText required' }, { status: 400 });
    }

    const { data: qaItem } = await supabaseAdmin
      .from('qa_items')
      .select('id, google_question_id, business_id')
      .eq('id', qaItemId)
      .maybeSingle();

    if (!qaItem) return NextResponse.json({ error: 'Q&A item not found' }, { status: 404 });

    // Verify ownership
    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('id', qaItem.business_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (!business) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const accessToken = await getValidAccessToken(userId);
    if (!accessToken) return NextResponse.json({ error: 'No valid access token' }, { status: 401 });

    const success = await upsertAnswer(accessToken, qaItem.google_question_id, answerText.trim());

    if (!success) return NextResponse.json({ error: 'Failed to post answer to Google' }, { status: 500 });

    await supabaseAdmin
      .from('qa_items')
      .update({
        answer_status: 'posted',
        final_answer: answerText.trim(),
        answered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', qaItemId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Post Answer] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to post answer' }, { status: 500 });
  }
}
