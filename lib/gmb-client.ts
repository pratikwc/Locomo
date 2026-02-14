interface GMBAccount {
  name: string;
  accountName: string;
  type: string;
  role?: string;
}

interface GMBLocation {
  name: string;
  title: string;
  storefrontAddress?: {
    addressLines?: string[];
    locality?: string;
    administrativeArea?: string;
    postalCode?: string;
    regionCode?: string;
  };
  phoneNumbers?: {
    primaryPhone?: string;
  };
  websiteUri?: string;
  regularHours?: {
    periods?: Array<{
      openDay?: string;
      openTime?: string;
      closeDay?: string;
      closeTime?: string;
    }>;
  };
  categories?: {
    primaryCategory?: { displayName: string };
    additionalCategories?: Array<{ displayName: string }>;
  };
  profile?: {
    description?: string;
  };
  metadata?: {
    mapsUri?: string;
  };
  latlng?: {
    latitude: number;
    longitude: number;
  };
}

interface GMBReview {
  name: string;
  reviewId: string;
  reviewer: {
    profilePhotoUrl?: string;
    displayName: string;
  };
  starRating: string;
  comment?: string;
  createTime: string;
  updateTime: string;
  reviewReply?: {
    comment: string;
    updateTime: string;
  };
}

interface UserProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

const GMB_API_BASE = 'https://mybusinessbusinessinformation.googleapis.com/v1';
const GMB_ACCOUNT_MANAGEMENT_BASE = 'https://mybusinessaccountmanagement.googleapis.com/v1';

async function fetchWithAuth(url: string, accessToken: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GMB API Error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

export async function getUserProfile(accessToken: string): Promise<UserProfile> {
  const data = await fetchWithAuth(
    'https://www.googleapis.com/oauth2/v2/userinfo',
    accessToken
  );

  return {
    id: data.id,
    email: data.email,
    name: data.name,
    picture: data.picture,
  };
}

export async function listGMBAccounts(accessToken: string): Promise<GMBAccount[]> {
  try {
    const data = await fetchWithAuth(
      `${GMB_ACCOUNT_MANAGEMENT_BASE}/accounts`,
      accessToken
    );

    return data.accounts || [];
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error('[GMB] Error listing accounts:', errorMessage);

    if (errorMessage.includes('429') || errorMessage.includes('RATE_LIMIT_EXCEEDED')) {
      console.warn('[GMB] Rate limit exceeded - GMB API quota needs to be enabled in Google Cloud Console');
    }

    return [];
  }
}

export async function listBusinessLocations(
  accessToken: string,
  accountName: string
): Promise<GMBLocation[]> {
  try {
    const data = await fetchWithAuth(
      `${GMB_API_BASE}/${accountName}/locations?readMask=name,title,storefrontAddress,phoneNumbers,websiteUri,regularHours,categories,profile,metadata,latlng`,
      accessToken
    );

    return data.locations || [];
  } catch (error) {
    console.error('Error listing business locations:', error);
    return [];
  }
}

export async function getBusinessInfo(
  accessToken: string,
  locationName: string
): Promise<GMBLocation | null> {
  try {
    const data = await fetchWithAuth(
      `${GMB_API_BASE}/${locationName}?readMask=name,title,storefrontAddress,phoneNumbers,websiteUri,regularHours,categories,profile,metadata,latlng`,
      accessToken
    );

    return data;
  } catch (error) {
    console.error('Error getting business info:', error);
    return null;
  }
}

export async function listReviews(
  accessToken: string,
  accountName: string,
  locationName: string
): Promise<GMBReview[]> {
  try {
    const locationId = locationName.split('/').pop();
    const data = await fetchWithAuth(
      `https://mybusiness.googleapis.com/v4/${accountName}/locations/${locationId}/reviews`,
      accessToken
    );

    return data.reviews || [];
  } catch (error) {
    console.error('Error listing reviews:', error);
    return [];
  }
}

export async function replyToReview(
  accessToken: string,
  reviewName: string,
  replyText: string
): Promise<boolean> {
  try {
    await fetchWithAuth(
      `https://mybusiness.googleapis.com/v4/${reviewName}/reply`,
      accessToken,
      {
        method: 'PUT',
        body: JSON.stringify({ comment: replyText }),
      }
    );

    return true;
  } catch (error) {
    console.error('Error replying to review:', error);
    return false;
  }
}

export async function updateBusinessInfo(
  accessToken: string,
  locationName: string,
  updateData: Partial<GMBLocation>
): Promise<boolean> {
  try {
    await fetchWithAuth(
      `${GMB_API_BASE}/${locationName}?updateMask=${Object.keys(updateData).join(',')}`,
      accessToken,
      {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      }
    );

    return true;
  } catch (error) {
    console.error('Error updating business info:', error);
    return false;
  }
}

export function calculateProfileCompleteness(location: GMBLocation): number {
  let score = 0;
  const maxScore = 100;
  const weights = {
    title: 10,
    address: 15,
    phone: 10,
    website: 10,
    hours: 15,
    categories: 10,
    description: 15,
    location: 15,
  };

  if (location.title) score += weights.title;
  if (location.storefrontAddress) score += weights.address;
  if (location.phoneNumbers?.primaryPhone) score += weights.phone;
  if (location.websiteUri) score += weights.website;
  if (location.regularHours?.periods && location.regularHours.periods.length > 0) {
    score += weights.hours;
  }
  if (location.categories?.primaryCategory) score += weights.categories;
  if (location.profile?.description) score += weights.description;
  if (location.latlng) score += weights.location;

  return Math.round((score / maxScore) * 100);
}

export interface BusinessData {
  businessId: string;
  name: string;
  category: string | null;
  additionalCategories: string[];
  address: any;
  phone: string | null;
  website: string | null;
  description: string | null;
  hours: any;
  latitude: number | null;
  longitude: number | null;
  profileCompleteness: number;
}

export function transformLocationToBusinessData(location: GMBLocation): BusinessData {
  return {
    businessId: location.name,
    name: location.title,
    category: location.categories?.primaryCategory?.displayName || null,
    additionalCategories: location.categories?.additionalCategories?.map(c => c.displayName) || [],
    address: location.storefrontAddress ? {
      addressLines: location.storefrontAddress.addressLines || [],
      locality: location.storefrontAddress.locality || '',
      administrativeArea: location.storefrontAddress.administrativeArea || '',
      postalCode: location.storefrontAddress.postalCode || '',
      regionCode: location.storefrontAddress.regionCode || '',
    } : null,
    phone: location.phoneNumbers?.primaryPhone || null,
    website: location.websiteUri || null,
    description: location.profile?.description || null,
    hours: location.regularHours || null,
    latitude: location.latlng?.latitude || null,
    longitude: location.latlng?.longitude || null,
    profileCompleteness: calculateProfileCompleteness(location),
  };
}
