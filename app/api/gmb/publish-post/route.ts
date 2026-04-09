import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUserId } from '@/lib/auth-utils';
import { getValidAccessToken } from '@/lib/google-token-manager';
import { createLocalPost } from '@/lib/gmb-client';

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { postId, businessId, title, content, postType = 'STANDARD', callToAction, aiGenerated = false, aiPrompt, imageUrl } = await request.json();

    if (!businessId || !content?.trim()) {
      return NextResponse.json({ error: 'businessId and content are required' }, { status: 400 });
    }

    // Verify business ownership and get GMB identifiers
    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('id, business_id, google_account_id, name')
      .eq('id', businessId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    if (!business.business_id) return NextResponse.json({ error: 'Business not synced with Google yet' }, { status: 400 });

    // Get GMB account name
    const { data: googleAccount } = await supabaseAdmin
      .from('google_accounts')
      .select('gmb_account_name')
      .eq('id', business.google_account_id)
      .maybeSingle();

    if (!googleAccount?.gmb_account_name) {
      return NextResponse.json({ error: 'Google account not configured' }, { status: 400 });
    }

    const accessToken = await getValidAccessToken(userId);
    if (!accessToken) {
      return NextResponse.json({ error: 'Failed to get valid access token' }, { status: 401 });
    }

    // Build the GMB location path: accounts/{accountId}/locations/{locationId}
    // business.business_id may be "locations/123" or "accounts/x/locations/123"
    let locationPath: string;
    if (business.business_id.startsWith('accounts/')) {
      locationPath = business.business_id;
    } else {
      const accountId = googleAccount.gmb_account_name.replace('accounts/', '');
      const locationId = business.business_id.replace('locations/', '');
      locationPath = `accounts/${accountId}/locations/${locationId}`;
    }

    // Publish to GMB
    const gmbPost = await createLocalPost(accessToken, locationPath, {
      topicType: postType as 'STANDARD' | 'EVENT' | 'OFFER',
      summary: content,
      callToAction: callToAction || undefined,
      mediaUrl: imageUrl || undefined,
    });

    if (!gmbPost) {
      return NextResponse.json({ error: 'Failed to publish post to Google' }, { status: 500 });
    }

    const now = new Date().toISOString();

    // Update existing draft OR create a new record
    if (postId) {
      const { data: updatedPost, error } = await supabaseAdmin
        .from('posts')
        .update({
          title: title || null,
          content,
          status: 'published',
          published_at: now,
          google_post_id: gmbPost.name,
          post_type: postType,
          call_to_action: callToAction || null,
          ai_generated: aiGenerated,
          ai_prompt: aiPrompt || null,
          image_url: imageUrl || null,
          updated_at: now,
        })
        .eq('id', postId)
        .eq('business_id', businessId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return NextResponse.json({ post: updatedPost, gmbName: gmbPost.name });
    }

    // Create new post record
    const { data: newPost, error: insertError } = await supabaseAdmin
      .from('posts')
      .insert({
        business_id: businessId,
        title: title || null,
        content,
        status: 'published',
        published_at: now,
        google_post_id: gmbPost.name,
        post_type: postType,
        call_to_action: callToAction || null,
        ai_generated: aiGenerated,
        ai_prompt: aiPrompt || null,
        image_url: imageUrl || null,
      })
      .select()
      .single();

    if (insertError) throw new Error(insertError.message);

    return NextResponse.json({ post: newPost, gmbName: gmbPost.name });
  } catch (error: any) {
    console.error('[Publish Post] Error:', error);
    const status = error?.gmbError?.code ?? 500;
    return NextResponse.json(
      { error: error.message || 'Failed to publish post' },
      { status }
    );
  }
}
