import { supabaseAdmin } from './supabase-admin';
import { createHash } from 'crypto';

export interface CacheOptions {
  ttlMinutes?: number;
}

export async function getCachedData<T>(
  userId: string,
  endpoint: string,
  params: Record<string, any> = {},
  options: CacheOptions = {}
): Promise<T | null> {
  const paramsHash = hashParams(params);

  const { data, error } = await supabaseAdmin
    .from('gmb_api_cache')
    .select('response_data, expires_at')
    .eq('user_id', userId)
    .eq('endpoint', endpoint)
    .eq('params_hash', paramsHash)
    .maybeSingle();

  if (error || !data) {
    console.log('[Cache] Miss:', endpoint);
    return null;
  }

  // Check if cache is still valid
  const expiresAt = new Date(data.expires_at);
  if (expiresAt < new Date()) {
    console.log('[Cache] Expired:', endpoint);
    // Clean up expired cache
    await supabaseAdmin
      .from('gmb_api_cache')
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', endpoint)
      .eq('params_hash', paramsHash);
    return null;
  }

  console.log('[Cache] Hit:', endpoint);
  return data.response_data as T;
}

export async function setCachedData<T>(
  userId: string,
  endpoint: string,
  params: Record<string, any> = {},
  data: T,
  options: CacheOptions = {}
): Promise<void> {
  const paramsHash = hashParams(params);
  const ttlMinutes = options.ttlMinutes || getDefaultTTL(endpoint);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  console.log('[Cache] Set:', endpoint, `(TTL: ${ttlMinutes}min)`);

  // Upsert cache entry
  const { error } = await supabaseAdmin
    .from('gmb_api_cache')
    .upsert({
      user_id: userId,
      endpoint,
      params_hash: paramsHash,
      response_data: data as any,
      cached_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    }, {
      onConflict: 'user_id,endpoint,params_hash'
    });

  if (error) {
    console.error('[Cache] Error saving cache:', error);
  }
}

export async function clearUserCache(userId: string): Promise<void> {
  console.log('[Cache] Clearing all cache for user:', userId);

  const { error } = await supabaseAdmin
    .from('gmb_api_cache')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('[Cache] Error clearing cache:', error);
  }
}

export async function clearEndpointCache(
  userId: string,
  endpoint: string
): Promise<void> {
  console.log('[Cache] Clearing cache for endpoint:', endpoint);

  const { error } = await supabaseAdmin
    .from('gmb_api_cache')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', endpoint);

  if (error) {
    console.error('[Cache] Error clearing endpoint cache:', error);
  }
}

function hashParams(params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {} as Record<string, any>);

  return createHash('sha256')
    .update(JSON.stringify(sortedParams))
    .digest('hex');
}

function getDefaultTTL(endpoint: string): number {
  // Different endpoints have different cache lifetimes
  if (endpoint.includes('accounts')) {
    return 5; // 5 minutes for account lists
  }
  if (endpoint.includes('locations')) {
    return 60; // 1 hour for business locations
  }
  if (endpoint.includes('reviews')) {
    return 10; // 10 minutes for reviews
  }
  return 15; // 15 minutes default
}
