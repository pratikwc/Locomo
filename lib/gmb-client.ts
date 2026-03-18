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

// API base URLs
const GMB_V4_BASE = 'https://mybusiness.googleapis.com/v4';
const GMB_BUSINESS_INFO_BASE = 'https://mybusinessbusinessinformation.googleapis.com/v1';
const GMB_ACCOUNT_MANAGEMENT_BASE = 'https://mybusinessaccountmanagement.googleapis.com/v1';

export interface GMBApiError {
  code: number;
  message: string;
  retryable: boolean;
  retryAfter?: number;
  userMessage: string;
  recoverySteps?: string[];
}

function parseGMBError(status: number, errorText: string): GMBApiError {
  const baseError: GMBApiError = {
    code: status,
    message: errorText,
    retryable: false,
    userMessage: 'An error occurred',
  };

  if (status === 429) {
    return {
      ...baseError,
      retryable: true,
      retryAfter: 900000,
      userMessage: 'Rate limit exceeded. Too many requests to Google My Business API.',
      recoverySteps: [
        'Wait 15 minutes before trying again',
        'Check your Google Cloud Console quota usage',
      ],
    };
  }

  if (status === 403) {
    return {
      ...baseError,
      retryable: false,
      userMessage: 'Access denied. Google My Business APIs may not be enabled.',
      recoverySteps: [
        'Go to Google Cloud Console > APIs & Services > Library',
        'Enable: My Business Reviews API, My Business Business Information API',
        'Wait 5 minutes then try again',
      ],
    };
  }

  if (status === 401) {
    return {
      ...baseError,
      retryable: false,
      userMessage: 'Authentication failed. Please reconnect your Google account.',
    };
  }

  if (status === 404) {
    return {
      ...baseError,
      retryable: false,
      userMessage: 'Resource not found. The location or account path may be incorrect.',
    };
  }

  if (status >= 500) {
    return {
      ...baseError,
      retryable: true,
      retryAfter: 5000,
      userMessage: 'Google servers are temporarily unavailable.',
    };
  }

  return baseError;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithAuth(url: string, accessToken: string, options: RequestInit = {}) {
  console.log(`[GMB] Fetching: ${url}`);

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
    console.error(`[GMB] API Error - Status: ${response.status}, URL: ${url}`);
    const parsedError = parseGMBError(response.status, errorText);
    const error = new Error(parsedError.userMessage) as Error & { gmbError: GMBApiError };
    error.gmbError = parsedError;
    throw error;
  }

  return response.json();
}

export async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 2000
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const gmbError = error.gmbError as GMBApiError | undefined;
      if (!gmbError?.retryable || attempt === maxRetries) throw error;
      const delay = gmbError.retryAfter || (baseDelay * Math.pow(2, attempt));
      console.log(`[GMB] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
      await sleep(delay);
    }
  }

  throw lastError;
}

export async function getUserProfile(accessToken: string): Promise<UserProfile> {
  const data = await fetchWithAuth('https://www.googleapis.com/oauth2/v2/userinfo', accessToken);
  return { id: data.id, email: data.email, name: data.name, picture: data.picture };
}

export async function listGMBAccounts(accessToken: string): Promise<GMBAccount[]> {
  const data = await fetchWithAuth(`${GMB_ACCOUNT_MANAGEMENT_BASE}/accounts`, accessToken);
  return data.accounts || [];
}

export async function listBusinessLocations(
  accessToken: string,
  accountName: string
): Promise<GMBLocation[]> {
  try {
    const data = await fetchWithAuth(
      `${GMB_BUSINESS_INFO_BASE}/${accountName}/locations?readMask=name,title,storefrontAddress,phoneNumbers,websiteUri,regularHours,categories,profile,metadata,latlng`,
      accessToken
    );
    return data.locations || [];
  } catch (error) {
    console.error('Error listing business locations:', error);
    return [];
  }
}

export async function discoverAccountsFromLocations(
  accessToken: string
): Promise<{ accountName: string; locations: GMBLocation[] } | null> {
  try {
    const userProfile = await getUserProfile(accessToken);
    const accountName = `accounts/${userProfile.id}`;
    const locations = await listBusinessLocations(accessToken, accountName);
    if (locations.length > 0) return { accountName, locations };
    return null;
  } catch (error) {
    console.error('Error discovering accounts from locations:', error);
    return null;
  }
}

export async function getBusinessInfo(
  accessToken: string,
  locationName: string
): Promise<GMBLocation | null> {
  try {
    const data = await fetchWithAuth(
      `${GMB_BUSINESS_INFO_BASE}/${locationName}?readMask=name,title,storefrontAddress,phoneNumbers,websiteUri,regularHours,categories,profile,metadata,latlng`,
      accessToken
    );
    return data;
  } catch (error) {
    console.error('Error getting business info:', error);
    return null;
  }
}

/**
 * Fetch reviews using the correct Google My Business API v4 endpoint.
 *
 * Correct URL (v4):
 *   GET https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/reviews
 *
 * NOTE: mybusinessreviews.googleapis.com/v1 does NOT support standalone
 * locations/{id}/reviews — that always returns 404.
 */
export async function listReviews(
  accessToken: string,
  accountName: string,
  locationName: string
): Promise<GMBReview[]> {
  if (!accountName || !accountName.startsWith('accounts/')) {
    throw new Error(
      `[GMB] Cannot fetch reviews: invalid accountName "${accountName}". Must be "accounts/{id}".`
    );
  }

  // Extract numeric IDs only
  const accountId = accountName.replace('accounts/', '');
  const locationId = locationName.startsWith('locations/')
    ? locationName.replace('locations/', '')
    : locationName;

  // Use the v4 mybusiness.googleapis.com endpoint — the only one that works
  const url = `${GMB_V4_BASE}/accounts/${accountId}/locations/${locationId}/reviews?pageSize=50`;
  console.log(`[GMB] Fetching reviews: ${url}`);

  const data = await fetchWithAuth(url, accessToken);
  console.log(`[GMB] Got ${data.reviews?.length || 0} reviews for location ${locationId}`);
  return data.reviews || [];
}

export async function replyToReview(
  accessToken: string,
  reviewName: string,
  replyText: string
): Promise<boolean> {
  try {
    // reviewName from Google is the full v4 path:
    // "accounts/{accountId}/locations/{locationId}/reviews/{reviewId}"
    // Use v4 base for the reply endpoint too
    const url = reviewName.startsWith('accounts/')
      ? `${GMB_V4_BASE}/${reviewName}/reply`
      : `${GMB_V4_BASE}/${reviewName}/reply`;

    await fetchWithAuth(url, accessToken, {
      method: 'PUT',
      body: JSON.stringify({ comment: replyText }),
    });
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
      `${GMB_BUSINESS_INFO_BASE}/${locationName}?updateMask=${Object.keys(updateData).join(',')}`,
      accessToken,
      { method: 'PATCH', body: JSON.stringify(updateData) }
    );
    return true;
  } catch (error) {
    console.error('Error updating business info:', error);
    return false;
  }
}

export function calculateProfileCompleteness(location: GMBLocation): number {
  let score = 0;
  const weights = { title: 10, address: 15, phone: 10, website: 10, hours: 15, categories: 10, description: 15, location: 15 };
  if (location.title) score += weights.title;
  if (location.storefrontAddress) score += weights.address;
  if (location.phoneNumbers?.primaryPhone) score += weights.phone;
  if (location.websiteUri) score += weights.website;
  if (location.regularHours?.periods?.length) score += weights.hours;
  if (location.categories?.primaryCategory) score += weights.categories;
  if (location.profile?.description) score += weights.description;
  if (location.latlng) score += weights.location;
  return Math.round((score / 100) * 100);
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

interface LocationInsights {
  date: string;
  views: number;
  searches: number;
  actionsPhone: number;
  actionsWebsite: number;
  actionsDirections: number;
}

export async function getLocationInsights(
  accessToken: string,
  locationName: string,
  startDate: string,
  endDate: string
): Promise<LocationInsights[]> {
  try {
    const url = `https://mybusiness.googleapis.com/v4/${locationName}/insights:basicMetrics`;
    const body = {
      locationNames: [locationName],
      basicRequest: {
        metricRequests: [
          { metric: 'QUERIES_DIRECT' }, { metric: 'QUERIES_INDIRECT' },
          { metric: 'VIEWS_MAPS' }, { metric: 'VIEWS_SEARCH' },
          { metric: 'ACTIONS_WEBSITE' }, { metric: 'ACTIONS_PHONE' },
          { metric: 'ACTIONS_DRIVING_DIRECTIONS' },
        ],
        timeRange: { startTime: startDate, endTime: endDate },
      },
    };
    const data = await fetchWithAuth(url, accessToken, { method: 'POST', body: JSON.stringify(body) });
    const insights: LocationInsights[] = [];
    if (data.locationMetrics?.[0]?.metricValues) {
      const metricsByDate: Record<string, any> = {};
      for (const mv of data.locationMetrics[0].metricValues) {
        const date = mv.dimensionalValues?.[0]?.timeDimension?.timeRange?.startTime || '';
        if (!metricsByDate[date]) {
          metricsByDate[date] = { date, views: 0, searches: 0, actionsPhone: 0, actionsWebsite: 0, actionsDirections: 0 };
        }
        const value = parseInt(mv.totalValue?.value || '0');
        if (mv.metric === 'VIEWS_MAPS' || mv.metric === 'VIEWS_SEARCH') metricsByDate[date].views += value;
        else if (mv.metric === 'QUERIES_DIRECT' || mv.metric === 'QUERIES_INDIRECT') metricsByDate[date].searches += value;
        else if (mv.metric === 'ACTIONS_PHONE') metricsByDate[date].actionsPhone = value;
        else if (mv.metric === 'ACTIONS_WEBSITE') metricsByDate[date].actionsWebsite = value;
        else if (mv.metric === 'ACTIONS_DRIVING_DIRECTIONS') metricsByDate[date].actionsDirections = value;
      }
      insights.push(...Object.values(metricsByDate));
    }
    return insights;
  } catch (error) {
    console.error('Error fetching location insights:', error);
    return [];
  }
}