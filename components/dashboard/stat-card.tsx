"use client";

import { ReactNode } from 'react';
import { CircleHelp as HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  badge?: {
    text: string;
    color: 'green' | 'yellow' | 'red' | 'blue' | 'gray';
  };
  progress?: number;
  industryAvg?: string;
  hint?: string;
  footer?: ReactNode;
}

const badgeColors = {
  green: 'bg-green-100 text-green-700 border border-green-200',
  yellow: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  red: 'bg-red-100 text-red-700 border border-red-200',
  blue: 'bg-blue-100 text-blue-700 border border-blue-200',
  gray: 'bg-gray-100 text-gray-600 border border-gray-200',
};

const progressBarColor = (pct: number) => {
  if (pct >= 80) return 'bg-green-500';
  if (pct >= 50) return 'bg-yellow-400';
  return 'bg-red-400';
};

export function StatCard({
  label,
  value,
  subtitle,
  badge,
  progress,
  industryAvg,
  hint,
  footer,
}: StatCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-1 min-w-0">
      <div className="flex items-center gap-1 text-xs text-gray-500 font-medium uppercase tracking-wide">
        {label}
        {hint && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-gray-400 cursor-help ml-0.5" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-xs">{hint}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <div className="flex items-center gap-2 mt-0.5">
        <span className="text-3xl font-bold text-gray-900 leading-tight">{value}</span>
        {badge && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeColors[badge.color]}`}>
            {badge.text}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
      )}

      {progress !== undefined && (
        <div className="mt-2">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${progressBarColor(progress)}`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      )}

      {industryAvg && (
        <p className="text-xs text-gray-400 mt-1">{industryAvg}</p>
      )}

      {footer && <div className="mt-1">{footer}</div>}
    </div>
  );
}
