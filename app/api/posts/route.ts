import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUserId } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: businesses } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('user_id', userId);

    if (!businesses?.length) return NextResponse.json({ posts: [] });

    const businessIds = businesses.map(b => b.id);

    const { data: posts, error } = await supabaseAdmin
      .from('posts')
      .select('*')
      .in('business_id', businessIds)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return NextResponse.json({ posts: posts ?? [] });
  } catch (error: any) {
    console.error('[Posts GET] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch posts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { businessId, title, content, postType = 'STANDARD', aiGenerated = false, aiPrompt, callToAction, scheduledFor, imageUrl } = body;

    if (!businessId || !content?.trim()) {
      return NextResponse.json({ error: 'businessId and content are required' }, { status: 400 });
    }

    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('id', businessId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    const { data: post, error } = await supabaseAdmin
      .from('posts')
      .insert({
        business_id: businessId,
        title: title || null,
        content,
        status: scheduledFor ? 'scheduled' : 'draft',
        scheduled_for: scheduledFor || null,
        ai_generated: aiGenerated,
        ai_prompt: aiPrompt || null,
        call_to_action: callToAction || null,
        post_type: postType,
        image_url: imageUrl || null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ post });
  } catch (error: any) {
    console.error('[Posts POST] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to save post' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('id');
    if (!postId) return NextResponse.json({ error: 'Post ID required' }, { status: 400 });

    const { data: businesses } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('user_id', userId);

    const businessIds = businesses?.map(b => b.id) ?? [];

    const { error } = await supabaseAdmin
      .from('posts')
      .delete()
      .eq('id', postId)
      .in('business_id', businessIds);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Posts DELETE] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete post' }, { status: 500 });
  }
}
