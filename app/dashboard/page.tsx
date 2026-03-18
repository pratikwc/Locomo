"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { LoadingScreen } from '@/components/loading-screen';
import { GoogleConnectionCards } from '@/components/dashboard/google-connection-cards';
import { StatCard } from '@/components/dashboard/stat-card';
import { RankingFactorRow } from '@/components/dashboard/ranking-factor-row';
import { ActionMetricCard } from '@/components/dashboard/action-metric-card';
import { QuickWinItem } from '@/components/dashboard/quick-win-item';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, Navigation, Globe, CalendarDays, Eye, MousePointerClick, Star, MessageSquare, RefreshCw, Loader as Loader2, CircleAlert as AlertCircle, ChevronDown, Copy, MapPin, Tag, Clock, Code as Code2, Settings } from 'lucide-react';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { api } from '@/lib/api-client';

interface LoadingStep {
  label: string;
  status: 'completed' | 'loading' | 'pending';
}

interface DashboardPayload {
  business: any;
  stats: {
    napScore: number;
    profileCompleteness: number;
    averageRating: number;
    totalReviews: number;
    pendingReviews: number;
    repliedReviews: number;
    reviewResponseRate: number;
    daysSinceLastReview: number | null;
    totalPosts: number;
    recentReviews: number;
    clickRate: number;
    monthlyViews: number;
    monthlySearches: number;
    monthlyPhoneCalls: number;
    monthlyDirections: number;
    monthlyWebsiteVisits: number;
    monthlyBookings: number;
    monthlyActions: number;
    photoCount: number;
  };
  healthScore: any;
  searchRankingFactors: Array<{
    name: string;
    score: number;
    status: string;
  }>;
  recentReviews: any[];
}

const HOUR_LABELS: Record<string, string> = {
  MONDAY: 'MON',
  TUESDAY: 'TUE',
  WEDNESDAY: 'WED',
  THURSDAY: 'THU',
  FRIDAY: 'FRI',
  SATURDAY: 'SAT',
  SUNDAY: 'SUN',
};

function formatTime(t?: string) {
  if (!t) return '-';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 || 12;
  return `${hour}:${String(m || 0).padStart(2, '0')} ${ampm}`;
}

function getScoreLabel(score: number) {
  if (score >= 80) return { text: 'Excellent', color: 'green' as const };
  if (score >= 60) return { text: 'Good', color: 'blue' as const };
  if (score >= 40) return { text: 'Needs Work', color: 'yellow' as const };
  return { text: 'Poor', color: 'red' as const };
}

function getRatingFreshnessLabel(days: number | null) {
  if (days === null) return { text: 'No reviews', color: 'gray' as const, days: '-' };
  if (days === 0) return { text: 'Fresh', color: 'green' as const, days: 'Today' };
  if (days <= 14) return { text: 'Fresh', color: 'green' as const, days: `${days} days ago` };
  if (days <= 30) return { text: 'Aging', color: 'yellow' as const, days: `${days} days ago` };
  return { text: 'Stale', color: 'red' as const, days: `${days} days ago` };
}

function getProblemCount(factors: any[]) {
  return factors.filter(f => f.status === 'danger' || f.status === 'warning').length;
}

export default function DashboardPage() {
  const router = useRouter();
  const { hasGoogleAccount, loading: authLoading, checkGoogleConnection } = useAuth();

  const [dashData, setDashData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasGMBAccess, setHasGMBAccess] = useState(true);
  const [showGoogleConnect, setShowGoogleConnect] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);

  const [loadingSteps, setLoadingSteps] = useState<LoadingStep[]>([
    { label: 'Authentication verified', status: 'loading' },
    { label: 'Checking Google connection', status: 'pending' },
    { label: 'Loading dashboard data', status: 'pending' },
  ]);
  const [loadingProgress, setLoadingProgress] = useState(33);

  const hasFetchedRef = useRef(false);
  const hasCheckedSuccessRef = useRef(false);
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);
  const [fetchFailed, setFetchFailed] = useState(false);

  useEffect(() => {
    if (!hasCheckedSuccessRef.current) {
      hasCheckedSuccessRef.current = true;
      const params = new URLSearchParams(window.location.search);
      if (params.get('success') === 'google_connected') {
        checkGoogleConnection();
        window.history.replaceState({}, '', '/dashboard');
      }
    }
  }, [checkGoogleConnection]);

  useEffect(() => {
    const init = async () => {
      if (authLoading) return;

      const googleStatus = hasGoogleAccount ?? false;

      await new Promise(r => setTimeout(r, 400));
      setLoadingSteps(prev => prev.map((s, i) => i === 0 ? { ...s, status: 'completed' } : s));
      setLoadingProgress(67);

      await new Promise(r => setTimeout(r, 300));
      setLoadingSteps(prev => prev.map((s, i) => i === 1 ? { ...s, status: 'loading' } : s));

      if (!googleStatus) {
        setLoadingSteps(prev => prev.map((s, i) => i === 1 ? { ...s, status: 'completed' } : s));
        setLoadingProgress(100);
        setShowGoogleConnect(true);
        setLoading(false);
        return;
      }

      setLoadingSteps(prev => prev.map((s, i) => i === 1 ? { ...s, status: 'completed' } : s));
      setLoadingProgress(85);

      await new Promise(r => setTimeout(r, 200));
      setLoadingSteps(prev => prev.map((s, i) => i === 2 ? { ...s, status: 'loading' } : s));

      hasFetchedRef.current = false;
      hasFetchedRef.current = true;
      await fetchData();

      setLoadingSteps(prev => prev.map((s, i) => i === 2 ? { ...s, status: 'completed' } : s));
      setLoadingProgress(100);
    };

    init();
  }, [hasGoogleAccount, authLoading]);

  useEffect(() => {
    if (dashData) {
      autoRefreshRef.current = setInterval(fetchData, 5 * 60 * 1000);
    }
    return () => { if (autoRefreshRef.current) clearInterval(autoRefreshRef.current); };
  }, [dashData]);

  const fetchData = async () => {
    try {
      const statusData = await api.get<any>('/api/gmb/check-status');

      if (statusData.has_gmb_access === false && statusData.connected === true) {
        setHasGMBAccess(false);
        setLoading(false);
        return;
      }

      if (!statusData.businesses?.length) {
        setHasGMBAccess(true);
        setLoading(false);
        return;
      }

      setHasGMBAccess(true);
      const bid = statusData.businesses[0].id;
      setBusinessId(bid);

      const data = await api.get<DashboardPayload>(`/api/dashboard?businessId=${bid}`);
      setDashData(data);
      setLoading(false);
    } catch {
      setFetchFailed(true);
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await api.post('/api/sync/all');
      hasFetchedRef.current = false;
      await fetchData();
      hasFetchedRef.current = true;
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return <LoadingScreen steps={loadingSteps} progress={loadingProgress} />;
  }

  if (showGoogleConnect) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <GoogleConnectionCards onConnectSuccess={checkGoogleConnection} />
      </div>
    );
  }

  if (fetchFailed) {
    return (
      <div className="p-6">
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <AlertCircle className="h-14 w-14 mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Unable to Load Dashboard</h2>
          <p className="text-gray-500 mb-6">There was a problem connecting to your account. Please try again.</p>
          <Button onClick={() => { setFetchFailed(false); setLoading(true); hasFetchedRef.current = false; fetchData(); }}>
            <RefreshCw className="mr-2 h-4 w-4" />Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!hasGMBAccess) {
    return (
      <div className="p-6">
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <AlertCircle className="h-14 w-14 mx-auto text-amber-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">No Google Business Profile Found</h2>
          <p className="text-gray-500 mb-6">You need a Google Business Profile to use this platform.</p>
          <Button onClick={() => router.push('/gmb-onboarding')}>Set Up Google Business Profile</Button>
        </div>
      </div>
    );
  }

  if (!dashData) {
    return (
      <div className="p-6">
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <RefreshCw className="h-14 w-14 mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Syncing Your Business Data</h2>
          <p className="text-gray-500 mb-6">Your Google Business Profile is connected. Click below to sync your data.</p>
          <Button onClick={handleSync} disabled={syncing}>
            {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      </div>
    );
  }

  const { business, stats, healthScore, searchRankingFactors, recentReviews } = dashData;
  const actionItems: any[] = healthScore?.action_items || [];
  const ratingFreshness = getRatingFreshnessLabel(stats.daysSinceLastReview);
  const overallScoreLabel = getScoreLabel(healthScore?.score ?? stats.profileCompleteness);
  const problemCount = getProblemCount(searchRankingFactors);

  const businessHours: Record<string, { open: string; close: string }> = {};
  const periods: any[] = business?.hours?.periods || [];
  for (const period of periods) {
    if (period.openDay) {
      businessHours[period.openDay] = {
        open: period.openTime?.hours !== undefined
          ? `${String(period.openTime.hours).padStart(2, '0')}:${String(period.openTime.minutes || 0).padStart(2, '0')}`
          : period.openTime || '',
        close: period.closeTime?.hours !== undefined
          ? `${String(period.closeTime.hours).padStart(2, '0')}:${String(period.closeTime.minutes || 0).padStart(2, '0')}`
          : period.closeTime || '',
      };
    }
  }

  const dayOrder = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

  const address = business?.address;
  const addressLines = address?.addressLines?.join(', ') || '';
  const cityLine = [address?.locality, address?.administrativeArea, address?.postalCode]
    .filter(Boolean).join(', ');
  const fullAddress = [addressLines, cityLine].filter(Boolean).join(', ');

  const services: string[] = business?.services || [];
  const category = business?.category || '';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1280px] mx-auto px-4 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Local SEO Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">Monitor and optimize your Google Business Profile performance</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
            className="flex-shrink-0"
          >
            {syncing
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Syncing...</>
              : <><RefreshCw className="mr-2 h-4 w-4" />Sync Now</>
            }
          </Button>
        </div>

        {/* Location selector bar */}
        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 flex-1">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span className="font-semibold text-gray-900 text-sm">{business?.name || 'Your Business'}</span>
            <Badge className="bg-green-100 text-green-700 border border-green-200 text-xs font-semibold">
              Verified
            </Badge>
          </div>
          {business?.last_synced_at && (
            <span className="text-xs text-gray-400 hidden sm:block">
              Synced {formatDistanceToNowStrict(new Date(business.last_synced_at), { addSuffix: true })}
            </span>
          )}
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </div>

        {/* Top Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="NAP Consistency"
            value={`${stats.napScore}%`}
            badge={stats.napScore >= 80
              ? { text: 'Excellent', color: 'green' }
              : stats.napScore >= 60
              ? { text: 'Good', color: 'blue' }
              : { text: 'Needs Work', color: 'yellow' }}
            progress={stats.napScore}
            industryAvg="Industry avg: 78%"
            hint="Name, Address, and Phone consistency across the web."
          />
          <StatCard
            label="Profile Completeness"
            value={`${stats.profileCompleteness}%`}
            badge={stats.profileCompleteness >= 80
              ? { text: 'Excellent', color: 'green' }
              : stats.profileCompleteness >= 60
              ? { text: 'Good', color: 'blue' }
              : { text: 'Needs Work', color: 'yellow' }}
            progress={stats.profileCompleteness}
            industryAvg="Industry avg: 72%"
            hint="How complete your Google Business Profile is."
          />
          <StatCard
            label="Overall Rating"
            value={stats.totalReviews > 0 ? stats.averageRating.toFixed(1) : '0.0'}
            subtitle={`From ${stats.totalReviews} review${stats.totalReviews !== 1 ? 's' : ''}`}
            badge={
              stats.totalReviews === 0
                ? { text: 'No Reviews', color: 'gray' }
                : stats.averageRating >= 4.5
                ? { text: 'Excellent', color: 'green' }
                : stats.averageRating >= 3.5
                ? { text: 'Good', color: 'blue' }
                : { text: 'Needs Work', color: 'yellow' }
            }
            industryAvg="Industry avg: 4.2 stars"
            hint="Your average star rating from all Google reviews."
            footer={
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(s => (
                  <Star
                    key={s}
                    className={`h-3.5 w-3.5 ${s <= Math.round(stats.averageRating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`}
                  />
                ))}
              </div>
            }
          />
          <StatCard
            label="Review Freshness"
            value={ratingFreshness.days}
            badge={{ text: ratingFreshness.text, color: ratingFreshness.color }}
            subtitle={ratingFreshness.days !== '-' ? 'Target: review within 14 days' : 'Get your first review'}
            hint="How recently you received a new customer review."
          />
        </div>

        {/* Search Ranking Factors */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Settings className="h-4 w-4 text-gray-500" />
            <h2 className="text-sm font-bold text-gray-900">Search Ranking Factors</h2>
          </div>
          <p className="text-xs text-gray-500 mb-3">How Google determines your local search position</p>

          {problemCount > 0 && (
            <div className="mb-4 px-3 py-2.5 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800 font-medium">
              {problemCount} factor{problemCount > 1 ? 's' : ''} need{problemCount === 1 ? 's' : ''} attention.{' '}
              <span className="text-yellow-700">Improving these can boost your local search ranking.</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 divide-y md:divide-y-0 md:divide-x divide-gray-100">
            <div>
              {searchRankingFactors.slice(0, Math.ceil(searchRankingFactors.length / 2)).map(f => (
                <RankingFactorRow
                  key={f.name}
                  name={f.name}
                  score={f.score}
                  status={f.status as any}
                />
              ))}
            </div>
            <div className="md:pl-8">
              {searchRankingFactors.slice(Math.ceil(searchRankingFactors.length / 2)).map(f => (
                <RankingFactorRow
                  key={f.name}
                  name={f.name}
                  score={f.score}
                  status={f.status as any}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Customer Actions */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <MousePointerClick className="h-4 w-4 text-gray-500" />
            <h2 className="text-sm font-bold text-gray-900">Customer Actions</h2>
          </div>
          <p className="text-xs text-gray-500 mb-4">How people interact with your listing (last 30 days)</p>

          <div className="mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">High-Intent Actions</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <ActionMetricCard
                icon={<Phone className="h-4 w-4" />}
                label="Phone Calls"
                value={stats.monthlyPhoneCalls}
                hint="Total phone call actions in the last 30 days."
              />
              <ActionMetricCard
                icon={<Navigation className="h-4 w-4" />}
                label="Directions"
                value={stats.monthlyDirections}
                hint="Total direction requests in the last 30 days."
              />
              <ActionMetricCard
                icon={<Globe className="h-4 w-4" />}
                label="Website Visits"
                value={stats.monthlyWebsiteVisits}
                hint="Total website clicks from your listing."
              />
              <ActionMetricCard
                icon={<CalendarDays className="h-4 w-4" />}
                label="Bookings"
                value={stats.monthlyBookings}
                hint="Total booking actions from your listing."
              />
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Visibility & Reviews</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <ActionMetricCard
                icon={<Eye className="h-4 w-4" />}
                label="Profile Views"
                value={stats.monthlyViews}
                hint="Total profile impressions in the last 30 days."
              />
              <ActionMetricCard
                icon={<MousePointerClick className="h-4 w-4" />}
                label="Click Rate"
                value={`${stats.clickRate.toFixed(2)}%`}
                badge={stats.clickRate < 1 ? 'Low' : undefined}
                hint="Percentage of views that resulted in an action."
              />
              <ActionMetricCard
                icon={<Star className="h-4 w-4" />}
                label="New Reviews"
                value={stats.recentReviews}
                hint="New reviews received this month."
              />
              <ActionMetricCard
                icon={<MessageSquare className="h-4 w-4" />}
                label="Response Rate"
                value={`${Math.round(stats.reviewResponseRate * 100)}%`}
                badge={stats.reviewResponseRate < 0.5 ? 'Low' : undefined}
                hint="Percentage of reviews you have responded to."
              />
            </div>
          </div>
        </div>

        {/* Bottom 3-column section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Business Information */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                Business Information
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Core details about your business</p>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Globe className="h-3 w-3" /> Business Name
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-800 font-medium">{business?.name || '-'}</p>
                  <button className="text-gray-300 hover:text-gray-500 transition-colors">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Tag className="h-3 w-3" /> Category
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-800">{category || '-'}</p>
                  <button className="text-gray-300 hover:text-gray-500 transition-colors">
                    <Tag className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {services.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Services</p>
                  <p className="text-xs text-gray-600 leading-relaxed line-clamp-4">
                    {services.join(', ')}
                  </p>
                  <button className="text-xs text-blue-500 mt-1 hover:underline">Refresh Services</button>
                </div>
              )}

              {business?.description && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Description</p>
                  <p className="text-xs text-gray-600 leading-relaxed line-clamp-4">{business.description}</p>
                </div>
              )}

              <div className="pt-2 border-t border-gray-100">
                <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5 mb-2">
                  <MapPin className="h-3.5 w-3.5 text-gray-400" />
                  Contact Information
                </p>

                {fullAddress && (
                  <div className="mb-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Address</p>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs text-gray-700">{fullAddress}</p>
                      <button className="text-gray-300 hover:text-gray-500 flex-shrink-0">
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}

                {business?.phone && (
                  <div className="mb-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Phone</p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-700">{business.phone}</p>
                      <div className="flex gap-1">
                        <button className="text-gray-300 hover:text-gray-500"><Copy className="h-3 w-3" /></button>
                        <button className="text-gray-300 hover:text-gray-500"><Phone className="h-3 w-3" /></button>
                      </div>
                    </div>
                  </div>
                )}

                {business?.website && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Website</p>
                    <p className="text-xs text-blue-500 truncate">{business.website}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Star className="h-4 w-4 text-gray-500" />
                Performance Metrics
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Key statistics for this location</p>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1 mb-1">
                  <Star className="h-3 w-3" /> Rating
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '0.0'}
                  </span>
                  <div>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(s => (
                        <Star
                          key={s}
                          className={`h-3 w-3 ${s <= Math.round(stats.averageRating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-gray-400">({stats.totalReviews} reviews)</p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1 mb-1">
                  <MessageSquare className="h-3 w-3" /> Posts (All-Time)
                </p>
                <span className="text-2xl font-bold text-gray-900">{stats.totalPosts}</span>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Overall Health Score</p>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold text-gray-900">{healthScore?.score ?? stats.profileCompleteness}</span>
                  <div className="flex-1">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          (healthScore?.score ?? stats.profileCompleteness) >= 80
                            ? 'bg-green-500'
                            : (healthScore?.score ?? stats.profileCompleteness) >= 60
                            ? 'bg-blue-500'
                            : 'bg-yellow-500'
                        }`}
                        style={{ width: `${healthScore?.score ?? stats.profileCompleteness}%` }}
                      />
                    </div>
                    <span className={`text-xs font-semibold mt-0.5 inline-block ${
                      overallScoreLabel.color === 'green' ? 'text-green-600' :
                      overallScoreLabel.color === 'blue' ? 'text-blue-600' :
                      overallScoreLabel.color === 'yellow' ? 'text-yellow-600' : 'text-red-600'
                    }`}>{overallScoreLabel.text}</span>
                  </div>
                </div>
              </div>

              {healthScore && (
                <div className="space-y-1.5 pt-1">
                  {[
                    { label: 'Profile', key: 'profile_score' },
                    { label: 'Reviews', key: 'review_score' },
                    { label: 'Posts', key: 'post_score' },
                    { label: 'Engagement', key: 'engagement_score' },
                  ].map(({ label, key }) => {
                    const val = healthScore[key] ?? 0;
                    return (
                      <div key={key} className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-20 flex-shrink-0">{label}</span>
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${val >= 70 ? 'bg-green-400' : val >= 40 ? 'bg-yellow-400' : 'bg-red-400'}`}
                            style={{ width: `${val}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-600 w-8 text-right">{val}%</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {recentReviews.length > 0 && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Recent Reviews</p>
                  <div className="space-y-2">
                    {recentReviews.slice(0, 3).map((r: any) => (
                      <div key={r.id} className="flex items-start gap-2">
                        <Avatar className="w-6 h-6 flex-shrink-0">
                          <AvatarImage src={r.reviewer_photo_url || ''} />
                          <AvatarFallback className="text-xs">{r.reviewer_name?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium text-gray-700 truncate">{r.reviewer_name}</span>
                            <div className="flex gap-0.5 flex-shrink-0">
                              {[1,2,3,4,5].map(s => (
                                <Star key={s} className={`h-2.5 w-2.5 ${s <= r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                              ))}
                            </div>
                          </div>
                          {r.review_text && (
                            <p className="text-xs text-gray-500 line-clamp-1">{r.review_text}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2 text-xs text-blue-600 hover:text-blue-700"
                    onClick={() => router.push('/dashboard/reviews')}
                  >
                    View All Reviews
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Business Details + Quick Wins */}
          <div className="space-y-4">
            {/* Business Details */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="mb-3">
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  Business Details
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Hours, labels, and other settings</p>
              </div>

              {Object.keys(businessHours).length > 0 ? (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Business Hours
                  </p>
                  <div className="space-y-1">
                    {dayOrder.map(day => {
                      const h = businessHours[day];
                      if (!h) return null;
                      return (
                        <div key={day} className="flex items-center justify-between text-xs">
                          <span className="text-gray-500 font-medium w-10">{HOUR_LABELS[day]}</span>
                          <span className="text-gray-700">
                            {formatTime(h.open)} - {formatTime(h.close)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">No business hours set</p>
              )}

              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Code2 className="h-3 w-3" /> Developer: Raw Data
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
              </div>
            </div>

            {/* Quick Wins */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-5 w-5 rounded-full border-2 border-green-500 flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                </div>
                <h2 className="text-sm font-bold text-gray-900">Quick Wins</h2>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                {actionItems.length} improvement{actionItems.length !== 1 ? 's' : ''} to boost visibility
              </p>

              <div className="space-y-2">
                {actionItems.length === 0 ? (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-lg">
                    <Star className="h-4 w-4 text-green-500" />
                    <p className="text-sm text-green-700 font-medium">Great job! No urgent improvements needed.</p>
                  </div>
                ) : (
                  actionItems.slice(0, 4).map((item: any, i: number) => (
                    <QuickWinItem
                      key={i}
                      title={item.title}
                      description={item.description}
                      priority={item.priority}
                      action={item.type === 'profile' ? 'Fix' : item.type === 'reviews' ? 'Act' : undefined}
                      onAction={() => {
                        if (item.type === 'profile') router.push('/dashboard/profile');
                        else if (item.type === 'reviews') router.push('/dashboard/reviews');
                        else if (item.type === 'posts') router.push('/dashboard/posts');
                      }}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
