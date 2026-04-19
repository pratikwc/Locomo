import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUserId } from '@/lib/auth-utils';

export interface AuditItem {
  field: string;
  label: string;
  status: 'complete' | 'missing' | 'needs_improvement';
  priority: 'high' | 'medium' | 'low';
  impact: string;
  suggestion: string;
  score: number;    // points awarded (0 or max)
  maxScore: number; // max points for this field
}

export interface ProfileAudit {
  score: number;
  maxScore: number;
  percentage: number;
  items: AuditItem[];
  topAction: string;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 });

    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    const items: AuditItem[] = [];

    // Business name
    items.push({
      field: 'name',
      label: 'Business Name',
      status: business.name ? 'complete' : 'missing',
      priority: 'high',
      impact: 'Required for Google to index your listing',
      suggestion: 'Add your exact business name as it appears on your signage',
      score: business.name ? 10 : 0,
      maxScore: 10,
    });

    // Category
    items.push({
      field: 'category',
      label: 'Business Category',
      status: business.category ? 'complete' : 'missing',
      priority: 'high',
      impact: 'Primary category is the #1 ranking factor for local search',
      suggestion: 'Set your most specific primary category in Google Business Profile',
      score: business.category ? 15 : 0,
      maxScore: 15,
    });

    // Description
    const desc = business.description || '';
    const descStatus = desc.length >= 150 ? 'complete' : desc.length > 0 ? 'needs_improvement' : 'missing';
    items.push({
      field: 'description',
      label: 'Business Description',
      status: descStatus,
      priority: 'high',
      impact: 'Google uses your description to match search queries — 150+ chars recommended',
      suggestion: descStatus === 'needs_improvement'
        ? `Your description is ${desc.length} chars. Aim for 150–750 chars with local keywords.`
        : 'Write a 150–750 character description including your services and location.',
      score: descStatus === 'complete' ? 15 : descStatus === 'needs_improvement' ? 8 : 0,
      maxScore: 15,
    });

    // Phone
    items.push({
      field: 'phone',
      label: 'Phone Number',
      status: business.phone ? 'complete' : 'missing',
      priority: 'high',
      impact: 'Phone clicks are a direct ranking signal and conversion action',
      suggestion: 'Add your primary local phone number — avoid toll-free numbers',
      score: business.phone ? 10 : 0,
      maxScore: 10,
    });

    // Website
    items.push({
      field: 'website',
      label: 'Website URL',
      status: business.website ? 'complete' : 'missing',
      priority: 'medium',
      impact: 'Website clicks signal prominence and drive traffic',
      suggestion: 'Link to your website homepage or a relevant landing page',
      score: business.website ? 10 : 0,
      maxScore: 10,
    });

    // Hours
    const hasHours = business.hours?.periods?.length > 0;
    items.push({
      field: 'hours',
      label: 'Business Hours',
      status: hasHours ? 'complete' : 'missing',
      priority: 'high',
      impact: 'Missing hours reduce trust and can cause Google to suppress your listing',
      suggestion: 'Set regular hours for every day you are open — update for holidays',
      score: hasHours ? 15 : 0,
      maxScore: 15,
    });

    // Photos
    const photoCount = Array.isArray(business.photos) ? business.photos.length : 0;
    const photoStatus = photoCount >= 5 ? 'complete' : photoCount >= 1 ? 'needs_improvement' : 'missing';
    items.push({
      field: 'photos',
      label: 'Profile Photos',
      status: photoStatus,
      priority: 'medium',
      impact: 'Businesses with 10+ photos get 42% more direction requests',
      suggestion: photoStatus === 'needs_improvement'
        ? `You have ${photoCount} photo${photoCount !== 1 ? 's' : ''}. Add ${5 - photoCount} more — show interior, exterior, and products.`
        : 'Add at least 5 photos: exterior, interior, team, and products/services.',
      score: photoStatus === 'complete' ? 10 : photoStatus === 'needs_improvement' ? 5 : 0,
      maxScore: 10,
    });

    // Address
    const hasAddress = business.address?.addressLines?.length > 0 || business.address?.locality;
    items.push({
      field: 'address',
      label: 'Business Address',
      status: hasAddress ? 'complete' : 'missing',
      priority: 'high',
      impact: 'Address is required to appear in local map pack results',
      suggestion: 'Verify your address matches exactly what appears on your website and other directories',
      score: hasAddress ? 10 : 0,
      maxScore: 10,
    });

    // Location coordinates
    const hasLocation = business.latitude && business.longitude;
    items.push({
      field: 'location',
      label: 'Map Pin Location',
      status: hasLocation ? 'complete' : 'needs_improvement',
      priority: 'medium',
      impact: 'Accurate pin placement improves direction requests and local relevance',
      suggestion: 'Drag your map pin to your exact entrance in Google Business Profile',
      score: hasLocation ? 5 : 0,
      maxScore: 5,
    });

    const score = items.reduce((s, i) => s + i.score, 0);
    const maxScore = items.reduce((s, i) => s + i.maxScore, 0);
    const percentage = Math.round((score / maxScore) * 100);

    const topMissing = items
      .filter(i => i.status !== 'complete')
      .sort((a, b) => {
        const p = { high: 0, medium: 1, low: 2 };
        return p[a.priority] - p[b.priority];
      })[0];

    const topAction = topMissing
      ? `${topMissing.label}: ${topMissing.suggestion}`
      : 'Your profile is complete — keep posting weekly to maintain ranking.';

    return NextResponse.json({ score, maxScore, percentage, items, topAction });
  } catch (error: any) {
    console.error('[Profile Audit] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to audit profile' }, { status: 500 });
  }
}
