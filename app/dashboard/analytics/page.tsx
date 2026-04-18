"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Eye, Phone, Navigation, MousePointer,
  TrendingUp, TrendingDown, Minus, Loader2, RefreshCw,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api-client';
import { format, formatDistanceToNow } from 'date-fns';

interface DailyInsight {
  date: string;
  views: number;
  phone_calls: number;
  website_clicks: number;
  direction_requests: number;
}

interface Totals {
  profileViews: number;
  phoneCalls: number;
  websiteClicks: number;
  directionRequests: number;
  clickRate: number;
}

interface Trends {
  profileViews: number;
  phoneCalls: number;
  websiteClicks: number;
  directionRequests: number;
}

interface AnalyticsData {
  insights: DailyInsight[];
  totals: Totals;
  trends: Trends;
  lastSyncedAt: string | null;
  canSync: boolean;
}

const PERIOD_OPTIONS = [
  { label: '7 days', value: 7 },
  { label: '28 days', value: 28 },
  { label: '90 days', value: 90 },
];

function TrendBadge({ value }: { value: number }) {
  if (value === 0) return (
    <span className="flex items-center gap-1 text-xs text-gray-400">
      <Minus className="h-3 w-3" />0%
    </span>
  );
  const positive = value > 0;
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${positive ? 'text-green-600' : 'text-red-500'}`}>
      {positive
        ? <TrendingUp className="h-3 w-3" />
        : <TrendingDown className="h-3 w-3" />}
      {positive ? '+' : ''}{value}%
    </span>
  );
}

function formatNum(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [businessId, setBusinessId] = useState('');
  const [days, setDays] = useState(28);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  const fetchBusinessId = useCallback(async () => {
    const res = await api.get<{ businesses?: { id: string }[] }>('/api/gmb/check-status');
    const biz = res.businesses?.[0];
    if (biz?.id) setBusinessId(biz.id);
    return biz?.id ?? '';
  }, []);

  const fetchAnalytics = useCallback(async (bizId: string, d: number) => {
    if (!bizId) return;
    try {
      const res = await api.get<AnalyticsData>(`/api/analytics?businessId=${bizId}&days=${d}`);
      setData(res);
    } catch (err: any) {
      toast({ title: 'Failed to load analytics', description: err.message, variant: 'destructive' });
    }
  }, [toast]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const bizId = await fetchBusinessId();
        await fetchAnalytics(bizId, days);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handlePeriodChange = async (d: number) => {
    setDays(d);
    await fetchAnalytics(businessId, d);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.post('/api/gmb/sync-insights', {});
      toast({ title: 'Sync complete', description: 'Analytics updated from Google.' });
      await fetchAnalytics(businessId, days);
    } catch (err: any) {
      const msg = err.message?.includes('cooldown')
        ? 'Already synced recently. Try again later.'
        : err.message;
      toast({ title: 'Sync failed', description: msg, variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  const chartData = (data?.insights ?? []).map(d => ({
    date: format(new Date(d.date), 'MMM d'),
    views: d.views,
    phone: d.phone_calls,
    website: d.website_clicks,
    directions: d.direction_requests,
  }));

  const statCards = [
    { title: 'Profile Views', value: data?.totals.profileViews ?? 0, trend: data?.trends.profileViews ?? 0, icon: Eye },
    { title: 'Phone Calls', value: data?.totals.phoneCalls ?? 0, trend: data?.trends.phoneCalls ?? 0, icon: Phone },
    { title: 'Website Clicks', value: data?.totals.websiteClicks ?? 0, trend: data?.trends.websiteClicks ?? 0, icon: MousePointer },
    { title: 'Direction Requests', value: data?.totals.directionRequests ?? 0, trend: data?.trends.directionRequests ?? 0, icon: Navigation },
  ];

  const hasData = (data?.insights.length ?? 0) > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1100px] mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {data?.lastSyncedAt
                ? `Data as of ${formatDistanceToNow(new Date(data.lastSyncedAt), { addSuffix: true })} · ~2 day Google lag`
                : 'No data synced yet'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Period selector */}
            <div className="flex rounded-lg border border-gray-200 bg-white overflow-hidden">
              {PERIOD_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handlePeriodChange(opt.value)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    days === opt.value
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSync}
              disabled={syncing || !(data?.canSync ?? true)}
              className="gap-2"
            >
              {syncing
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Syncing...</>
                : <><RefreshCw className="h-3.5 w-3.5" />Sync Now</>}
            </Button>
          </div>
        </div>

        {/* Empty state */}
        {!hasData ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-xl p-16 text-center">
            <Eye className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p className="font-medium text-gray-600">No analytics data yet</p>
            <p className="text-sm text-gray-400 mt-1 mb-5">
              Sync your Google Business Profile to see performance data
            </p>
            <Button size="sm" onClick={handleSync} disabled={syncing}>
              {syncing
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Syncing...</>
                : <><RefreshCw className="mr-2 h-4 w-4" />Sync Now</>}
            </Button>
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {statCards.map(({ title, value, trend, icon: Icon }) => (
                <div key={title} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</p>
                    <Icon className="h-4 w-4 text-gray-300" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{formatNum(value)}</p>
                  <div className="mt-1 flex items-center gap-1">
                    <TrendBadge value={trend} />
                    <span className="text-xs text-gray-400">vs prior period</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Click rate card */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-700">Click-through Rate</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  % of profile views that result in an action (call, click, or directions)
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-blue-600">{data?.totals.clickRate ?? 0}%</p>
              </div>
            </div>

            {/* Profile views line chart */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="text-sm font-bold text-gray-700 mb-4">Profile Views</h2>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    tickLine={false}
                    axisLine={false}
                    interval={Math.floor(chartData.length / 6)}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="views"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    name="Profile Views"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Customer actions bar chart */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="text-sm font-bold text-gray-700 mb-4">Customer Actions</h2>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    tickLine={false}
                    axisLine={false}
                    interval={Math.floor(chartData.length / 6)}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="phone" fill="#3b82f6" name="Phone Calls" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="website" fill="#10b981" name="Website Clicks" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="directions" fill="#f59e0b" name="Directions" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
