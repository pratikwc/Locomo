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
// Performance API v1 — replaces deprecated v4 insights:basicMetrics
const GMB_PERFORMANCE_BASE = 'https://businessprofileperformance.googleapis.com/v1';

const LOCATION_READ_MASK =
  'name,title,storefrontAddress,phoneNumbers,websiteUri,regularHours,categories,profile,metadata,latlng';

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
        'Enable: My Business Reviews API, My Business Business Information API, Business Profile Performance API',
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
      `${GMB_BUSINESS_INFO_BASE}/${accountName}/locations?readMask=${LOCATION_READ_MASK}`,
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
      `${GMB_BUSINESS_INFO_BASE}/${locationName}?readMask=${LOCATION_READ_MASK}`,
      accessToken
    );
    return data;
  } catch (error) {
    console.error('Error getting business info:', error);
    return null;
  }
}

/**
 * Fetch ALL reviews using GMB API v4, paginating through every page.
 *
 * Correct URL:
 *   GET https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/reviews
 *
 * Max pageSize = 200 per request. Loops until no nextPageToken is returned.
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

  const accountId = accountName.replace('accounts/', '');
  const locationId = locationName.startsWith('locations/')
    ? locationName.replace('locations/', '')
    : locationName;

  const allReviews: GMBReview[] = [];
  let pageToken: string | undefined;
  let page = 1;

  do {
    const url = new URL(
      `${GMB_V4_BASE}/accounts/${accountId}/locations/${locationId}/reviews`
    );
    url.searchParams.set('pageSize', '200'); // Google's maximum per page
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    console.log(`[GMB] Fetching reviews page ${page}: ${url.toString()}`);
    const data = await fetchWithAuth(url.toString(), accessToken);

    if (data.reviews?.length) {
      allReviews.push(...data.reviews);
      console.log(`[GMB] Page ${page}: ${data.reviews.length} reviews (total: ${allReviews.length})`);
    }

    pageToken = data.nextPageToken;
    page++;
  } while (pageToken);

  console.log(`[GMB] Fetched all ${allReviews.length} reviews for location ${locationId}`);
  return allReviews;
}

export async function replyToReview(
  accessToken: string,
  reviewName: string,
  replyText: string
): Promise<boolean> {
  try {
    const url = `${GMB_V4_BASE}/${reviewName.replace(/^accounts\//, 'accounts/')}/reply`;
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

export interface LocalPostRequest {
  topicType: 'STANDARD' | 'EVENT' | 'OFFER';
  summary: string;
  callToAction?: {
    actionType: 'BOOK' | 'ORDER' | 'SHOP' | 'LEARN_MORE' | 'SIGN_UP' | 'CALL';
    url?: string;
  };
  /** Public image URL to attach to the post */
  mediaUrl?: string;
}

export interface LocalPostResponse {
  name: string;
  state: string;
  topicType: string;
  summary: string;
  createTime: string;
}

/**
 * Create a Google Business Profile local post.
 * locationName: full GMB path e.g. "accounts/123/locations/456"
 */
export async function createLocalPost(
  accessToken: string,
  locationName: string,
  post: LocalPostRequest
): Promise<LocalPostResponse | null> {
  try {
    const path = locationName.replace(/^\//, '');
    const url = `${GMB_V4_BASE}/${path}/localPosts`;

    const body: Record<string, unknown> = {
      topicType: post.topicType,
      summary: post.summary,
    };

    if (post.callToAction) {
      body.callToAction = post.callToAction;
    }

    if (post.mediaUrl) {
      body.media = [{ mediaFormat: 'PHOTO', sourceUrl: post.mediaUrl }];
    }

    const data = await fetchWithAuth(url, accessToken, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return data as LocalPostResponse;
  } catch (error) {
    console.error('[GMB] Error creating local post:', error);
    throw error;
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

export interface LocationInsights {
  date: string;
  profileViews: number;      // sum of all 4 impression metrics
  phoneCalls: number;
  websiteClicks: number;
  directionRequests: number;
}

export interface LocationInsightsTotals {
  profileViews: number;
  phoneCalls: number;
  websiteClicks: number;
  directionRequests: number;
  clickRate: number;          // (total actions / profileViews) * 100
  dailyBreakdown: LocationInsights[];
}

/**
 * Fetch performance metrics using the Business Profile Performance API v1.
 *
 * REPLACES the deprecated v4 `insights:basicMetrics` endpoint (removed Feb 2023).
 *
 * Endpoint:
 *   GET https://businessprofileperformance.googleapis.com/v1/locations/{locationId}:fetchMultiDailyMetricsTimeSeries
 *
 * locationName: "locations/{numericId}" OR just "{numericId}" — both handled.
 *
 * IMPORTANT: Requires "Business Profile Performance API" enabled in Google Cloud Console.
 * Default quota is 0 — you must request access from Google after enabling.
 */
export async function getLocationInsights(
  accessToken: string,
  locationName: string,
  startDate: string,  // e.g. "2024-01-01"
  endDate: string     // e.g. "2024-01-31"
): Promise<LocationInsightsTotals> {
  const empty: LocationInsightsTotals = {
    profileViews: 0,
    phoneCalls: 0,
    websiteClicks: 0,
    directionRequests: 0,
    clickRate: 0,
    dailyBreakdown: [],
  };

  try {
    const locationId = locationName.startsWith('locations/')
      ? locationName
      : `locations/${locationName}`;

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Use URLSearchParams with append() so repeated dailyMetrics keys are preserved
    const p = new URLSearchParams();
    p.append('dailyRange.start_date.year',  String(start.getFullYear()));
    p.append('dailyRange.start_date.month', String(start.getMonth() + 1));
    p.append('dailyRange.start_date.day',   String(start.getDate()));
    p.append('dailyRange.end_date.year',    String(end.getFullYear()));
    p.append('dailyRange.end_date.month',   String(end.getMonth() + 1));
    p.append('dailyRange.end_date.day',     String(end.getDate()));
    p.append('dailyMetrics', 'CALL_CLICKS');
    p.append('dailyMetrics', 'WEBSITE_CLICKS');
    p.append('dailyMetrics', 'BUSINESS_DIRECTION_REQUESTS');
    p.append('dailyMetrics', 'BUSINESS_IMPRESSIONS_DESKTOP_MAPS');
    p.append('dailyMetrics', 'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH');
    p.append('dailyMetrics', 'BUSINESS_IMPRESSIONS_MOBILE_MAPS');
    p.append('dailyMetrics', 'BUSINESS_IMPRESSIONS_MOBILE_SEARCH');

    const url = `${GMB_PERFORMANCE_BASE}/${locationId}:fetchMultiDailyMetricsTimeSeries?${p.toString()}`;
    console.log(`[GMB] Fetching performance metrics: ${url}`);

    const data = await fetchWithAuth(url, accessToken);

    if (!data.multiDailyMetricTimeSeries?.length) {
      console.warn('[GMB] Performance API returned no data');
      return empty;
    }

    // Accumulate by date
    const byDate: Record<string, LocationInsights> = {};

    const getOrCreate = (dateStr: string): LocationInsights => {
      if (!byDate[dateStr]) {
        byDate[dateStr] = { date: dateStr, profileViews: 0, phoneCalls: 0, websiteClicks: 0, directionRequests: 0 };
      }
      return byDate[dateStr];
    };

    for (const series of data.multiDailyMetricTimeSeries) {
      const metric: string = series.dailyMetricTimeSeries?.dailyMetric;
      const points: any[] = series.dailyMetricTimeSeries?.timeSeries?.datedValues || [];

      for (const point of points) {
        const { year, month, day } = point.date;
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const value = parseInt(point.value || '0', 10);
        const row = getOrCreate(dateStr);

        switch (metric) {
          case 'CALL_CLICKS':                          row.phoneCalls       += value; break;
          case 'WEBSITE_CLICKS':                       row.websiteClicks    += value; break;
          case 'BUSINESS_DIRECTION_REQUESTS':          row.directionRequests += value; break;
          case 'BUSINESS_IMPRESSIONS_DESKTOP_MAPS':
          case 'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH':
          case 'BUSINESS_IMPRESSIONS_MOBILE_MAPS':
          case 'BUSINESS_IMPRESSIONS_MOBILE_SEARCH':   row.profileViews     += value; break;
        }
      }
    }

    const dailyBreakdown = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));

    const totals = dailyBreakdown.reduce(
      (acc, row) => {
        acc.profileViews      += row.profileViews;
        acc.phoneCalls        += row.phoneCalls;
        acc.websiteClicks     += row.websiteClicks;
        acc.directionRequests += row.directionRequests;
        return acc;
      },
      { profileViews: 0, phoneCalls: 0, websiteClicks: 0, directionRequests: 0 }
    );

    const totalActions = totals.phoneCalls + totals.websiteClicks + totals.directionRequests;
    const clickRate = totals.profileViews > 0
      ? parseFloat(((totalActions / totals.profileViews) * 100).toFixed(2))
      : 0;

    return { ...totals, clickRate, dailyBreakdown };

  } catch (error) {
    console.error('[GMB] Error fetching location insights:', error);
    return empty;
  }
}