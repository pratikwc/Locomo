"use client";

import { useRouter } from 'next/navigation';
import { ArrowRight, Clock, TrendingUp, Zap } from 'lucide-react';

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: '5min' | '30min' | '1hr' | '1day';
  category: 'profile' | 'reviews' | 'posts' | 'photos' | 'hours';
  actionLabel: string;
  actionPath?: string;
}

const IMPACT_CONFIG = {
  high: { label: 'High Impact', className: 'bg-red-50 text-red-700 border-red-200' },
  medium: { label: 'Medium Impact', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  low: { label: 'Low Impact', className: 'bg-gray-100 text-gray-600 border-gray-200' },
};

const EFFORT_LABELS: Record<string, string> = {
  '5min': '5 min fix',
  '30min': '30 min',
  '1hr': '~1 hour',
  '1day': '~1 day',
};

export function RecommendationCard({ rec }: { rec: Recommendation }) {
  const router = useRouter();
  const impact = IMPACT_CONFIG[rec.impact];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${impact.className}`}>
              <TrendingUp className="h-2.5 w-2.5" />
              {impact.label}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 font-medium">
              <Clock className="h-2.5 w-2.5" />
              {EFFORT_LABELS[rec.effort] ?? rec.effort}
            </span>
          </div>
          <p className="text-sm font-semibold text-gray-900 leading-snug">{rec.title}</p>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{rec.description}</p>
        </div>
        {rec.actionPath && (
          <button
            onClick={() => router.push(rec.actionPath!)}
            className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 whitespace-nowrap mt-0.5"
          >
            {rec.actionLabel}
            <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

export function RecommendationCardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <div className="h-4 w-24 bg-gray-200 rounded-full" />
            <div className="h-4 w-16 bg-gray-100 rounded-full" />
          </div>
          <div className="h-4 w-3/4 bg-gray-200 rounded" />
          <div className="h-3 w-full bg-gray-100 rounded" />
          <div className="h-3 w-2/3 bg-gray-100 rounded" />
        </div>
        <div className="h-4 w-20 bg-gray-100 rounded" />
      </div>
    </div>
  );
}

export function RecommendationsSection({ businessId }: { businessId?: string }) {
  return null; // Rendered inline in dashboard — exported for reuse
}
