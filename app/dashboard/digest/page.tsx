"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FileText, Star, Eye, MessageSquare,
  TrendingUp, TrendingDown, Minus, ArrowRight, Loader2,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { format, parseISO } from 'date-fns';

interface DigestData {
  businessName: string;
  weekOf: string;
  posts: { count: number; items: { id: string; title: string; published_at: string }[] };
  reviews: { received: number; replied: number; avgRating: number };
  views: { thisWeek: number; priorWeek: number; trend: number };
  highlights: string[];
  topAction: string;
}

function TrendBadge({ trend }: { trend: number }) {
  if (trend > 0) return (
    <Badge className="bg-green-100 text-green-700 border-0 text-xs font-semibold">
      <TrendingUp className="h-3 w-3 mr-1" />+{trend}%
    </Badge>
  );
  if (trend < 0) return (
    <Badge className="bg-red-100 text-red-700 border-0 text-xs font-semibold">
      <TrendingDown className="h-3 w-3 mr-1" />{trend}%
    </Badge>
  );
  return (
    <Badge className="bg-gray-100 text-gray-500 border-0 text-xs font-semibold">
      <Minus className="h-3 w-3 mr-1" />0%
    </Badge>
  );
}

function StatCard({ icon: Icon, label, value, sub, trend }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  trend?: number;
}) {
  return (
    <Card className="bg-white border-gray-200">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between mb-2">
          <div className="p-2 rounded-lg bg-gray-50">
            <Icon className="h-4 w-4 text-gray-500" />
          </div>
          {trend !== undefined && <TrendBadge trend={trend} />}
        </div>
        <p className="text-2xl font-bold text-gray-900 mt-3">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function DigestPage() {
  const [digest, setDigest] = useState<DigestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [noData, setNoData] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const status = await api.get<any>('/api/gmb/check-status');
        const biz = status.businesses?.[0];
        if (!biz) { setNoData(true); setLoading(false); return; }
        const data = await api.get<DigestData>(`/api/digest?businessId=${biz.id}`);
        setDigest(data);
      } catch {
        setNoData(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (noData || !digest) {
    return (
      <div className="p-6">
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
          <FileText className="h-10 w-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 mb-4">No digest available. Connect your Google Business Profile first.</p>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  const weekStart = parseISO(digest.weekOf);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1100px] mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Weekly Digest</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Week of {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')} · {digest.businessName}
          </p>
        </div>

        {/* 4 stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={FileText} label="Posts Published" value={digest.posts.count} />
          <StatCard icon={MessageSquare} label="Reviews Replied" value={digest.reviews.replied} />
          <StatCard
            icon={Star}
            label="New Reviews"
            value={digest.reviews.received}
            sub={digest.reviews.received > 0 ? `avg ${digest.reviews.avgRating.toFixed(1)}★` : undefined}
          />
          <StatCard
            icon={Eye}
            label="Profile Views"
            value={digest.views.thisWeek.toLocaleString()}
            trend={digest.views.trend}
          />
        </div>

        {/* Highlights */}
        {digest.highlights.length > 0 && (
          <Card className="bg-white border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">This Week's Highlights</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {digest.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#6931FF] flex-shrink-0" />
                    {h}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Top action */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-4">
          <p className="text-xs font-semibold text-blue-700 mb-1">What to do next</p>
          <p className="text-sm text-blue-600">{digest.topAction}</p>
        </div>

        {/* Posts this week */}
        <Card className="bg-white border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Posts Published This Week</CardTitle>
          </CardHeader>
          <CardContent>
            {digest.posts.items.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-gray-400 mb-3">No posts published this week.</p>
                <Button asChild size="sm" variant="outline">
                  <Link href="/dashboard/posts">
                    Create a Post <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            ) : (
              <ul className="space-y-2">
                {digest.posts.items.map(post => (
                  <li key={post.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                    <FileText className="h-4 w-4 text-gray-300 flex-shrink-0" />
                    <span className="text-sm text-gray-700 flex-1">{post.title}</span>
                    {post.published_at && (
                      <span className="text-xs text-gray-400">
                        {format(parseISO(post.published_at), 'MMM d')}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
