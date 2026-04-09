import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-utils';
import { callOpenAI } from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { reviewText, rating, reviewerName, businessName, businessCategory } = await request.json();

    if (!rating || !reviewerName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const sentimentLabel =
      rating >= 4 ? 'positive' : rating === 3 ? 'neutral' : 'negative';

    const systemPrompt = `You are a professional business owner responding to Google reviews.
Write a concise, warm, and authentic reply (2-4 sentences max).
Never use placeholders like [business name].
Do not start with "Dear" — use the reviewer's first name naturally.
Do not be overly formal. Sound human, not corporate.`;

    const userPrompt = `Business: ${businessName || 'our business'}
Category: ${businessCategory || 'local business'}
Reviewer: ${reviewerName}
Rating: ${rating}/5 (${sentimentLabel})
Review text: ${reviewText || '(No written review — rating only)'}

Write a reply to this ${sentimentLabel} review.`;

    const reply = await callOpenAI(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.75, maxTokens: 200 }
    );

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error('[Generate Reply] Error:', error);
    // Fallback to template if OpenAI fails
    const { reviewerName, rating } = await request.json().catch(() => ({ reviewerName: 'there', rating: 5 }));
    const firstName = (reviewerName || 'there').split(' ')[0];
    const fallback =
      rating >= 4
        ? `Thank you so much, ${firstName}! We're so glad you had a great experience and look forward to seeing you again.`
        : rating === 3
        ? `Hi ${firstName}, thank you for your honest feedback. We'd love to hear more about how we can improve — please reach out to us directly.`
        : `${firstName}, we're truly sorry your experience fell short. Please contact us so we can make it right.`;
    return NextResponse.json({ reply: fallback });
  }
}
