import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { reviewText, rating, reviewerName } = await request.json();

    const aiGeneratedReply = generateReply(reviewText, rating, reviewerName);

    return NextResponse.json({ reply: aiGeneratedReply });
  } catch (error) {
    console.error('Generate reply error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateReply(reviewText: string, rating: number, reviewerName: string): string {
  const firstName = reviewerName.split(' ')[0];

  if (rating >= 4) {
    return `Thank you so much for your wonderful review, ${firstName}! We're thrilled to hear that you had a positive experience with us. Your feedback means the world to our team, and we look forward to serving you again soon!`;
  } else if (rating === 3) {
    return `Hi ${firstName}, thank you for taking the time to share your feedback. We appreciate your honest review and would love to know more about how we can improve your experience. Please feel free to reach out to us directly so we can make things right!`;
  } else {
    return `Dear ${firstName}, we sincerely apologize that your experience didn't meet your expectations. Your feedback is incredibly valuable to us, and we'd like the opportunity to make this right. Please contact us directly so we can address your concerns and work toward a better outcome. Thank you for giving us the chance to improve.`;
  }
}
