import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth-utils';
import { supabaseAdmin } from '@/lib/supabase-admin';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    const { prompt, businessName, businessCategory, postType = 'STANDARD' } = await request.json();

    if (!prompt && !businessName) {
      return NextResponse.json({ error: 'prompt or businessName is required' }, { status: 400 });
    }

    // Build a rich, professional prompt
    const imagePrompt = buildImagePrompt(prompt, businessName, businessCategory, postType);

    // Call Gemini Flash image generation (generateContent with IMAGE modality)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${GEMINI_API_KEY}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: imagePrompt }] }],
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
      }),
    });

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error('[Generate Image] Gemini API error:', errText);
      return NextResponse.json(
        { error: 'Image generation failed. Check Gemini API key and quota.' },
        { status: 502 }
      );
    }

    const geminiData = await geminiResponse.json();

    // Find the image part in the response
    const parts: any[] = geminiData.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));

    if (!imagePart?.inlineData?.data) {
      console.error('[Generate Image] No image in Gemini response:', JSON.stringify(geminiData));
      return NextResponse.json({ error: 'No image returned from Gemini' }, { status: 500 });
    }

    // Decode base64 → Buffer → upload to Supabase Storage
    const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64');
    const mimeType: string = imagePart.inlineData.mimeType || 'image/png';
    const extension = mimeType.split('/')[1] || 'png';
    const fileName = `${userId}/${Date.now()}.${extension}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('post-images')
      .upload(fileName, imageBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error('[Generate Image] Storage upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to store image' }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('post-images')
      .getPublicUrl(fileName);

    return NextResponse.json({ imageUrl: publicUrl, prompt: imagePrompt });
  } catch (error: any) {
    console.error('[Generate Image] Error:', error);
    return NextResponse.json({ error: error.message || 'Image generation failed' }, { status: 500 });
  }
}

function buildImagePrompt(
  userPrompt: string | undefined,
  businessName: string | undefined,
  category: string | undefined,
  postType: string
): string {
  const businessContext = businessName
    ? `for "${businessName}"${category ? `, a ${category}` : ''}`
    : '';

  const postContext: Record<string, string> = {
    STANDARD: 'a professional business announcement or update',
    OFFER: 'a special promotion or discount offer',
    EVENT: 'an exciting upcoming business event',
  };

  const base = userPrompt
    ? userPrompt
    : `${postContext[postType] || 'a business post'} ${businessContext}`;

  return `High-quality professional marketing photo for a Google Business Profile post. ${base}.
Photorealistic, bright and welcoming atmosphere, modern aesthetic, vibrant colors,
no text or logos overlaid on the image, clean composition, suitable for local business marketing.
Shot on professional camera, sharp focus, well-lit, 1:1 square format.`;
}
