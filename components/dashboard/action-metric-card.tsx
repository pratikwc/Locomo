"use client";

import { ReactNode } from 'react';
import { CircleHelp as HelpCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ActionMetricCardProps {
  icon: ReactNode;
  label: string;
  value: number | string;
  trend?: number;
  hint?: string;
  highlight?: boolean;
  badge?: string;
}

export function ActionMetricCard({ icon, label, value, trend, hint, highlight, badge }: ActionMetricCardProps) {
  const TrendIcon = trend === undefined || trend === 0
    ? Minus
    : trend > 0
    ? TrendingUp
    : TrendingDown;

  const trendColor = trend === undefined || trend === 0
    ? 'text-gray-400'
    : trend > 0
    ? 'text-green-600'
    : 'text-red-500';

  return (
    <div className={`flex flex-col gap-1 px-5 py-4 ${highlight ? 'bg-green-50 border-green-100' : 'bg-white border-gray-100'} border rounded-xl`}>
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <span className="text-gray-400">{icon}</span>
        {label}
        {hint && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3 w-3 text-gray-300 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-xs">{hint}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <div className="flex items-end gap-2 flex-wrap">
        <span className="text-3xl font-bold text-gray-900">{value}</span>
        {badge && (
          <span className="text-xs font-semibold text-red-500 bg-red-50 border border-red-100 rounded px-1.5 py-0.5 mb-1">
            {badge}
          </span>
        )}
        {trend !== undefined && (
          <div className={`flex items-center gap-0.5 text-xs ${trendColor} mb-1`}>
            <TrendIcon className="h-3 w-3" />
            <span>{trend > 0 ? '+' : ''}{trend}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
