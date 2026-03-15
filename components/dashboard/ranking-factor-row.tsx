"use client";

import { ChevronDown, CircleHelp as HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface RankingFactorRowProps {
  name: string;
  score: number;
  status: 'excellent' | 'ok' | 'warning' | 'danger' | 'neutral';
  hint?: string;
}

const statusDotColor: Record<string, string> = {
  excellent: 'bg-green-500',
  ok: 'bg-green-400',
  warning: 'bg-yellow-400',
  danger: 'bg-red-500',
  neutral: 'bg-gray-300',
};

const barColor: Record<string, string> = {
  excellent: 'bg-green-500',
  ok: 'bg-green-400',
  warning: 'bg-yellow-400',
  danger: 'bg-red-500',
  neutral: 'bg-gray-300',
};

const textColor: Record<string, string> = {
  excellent: 'text-green-600',
  ok: 'text-green-600',
  warning: 'text-yellow-600',
  danger: 'text-red-600',
  neutral: 'text-gray-400',
};

export function RankingFactorRow({ name, score, status, hint }: RankingFactorRowProps) {
  return (
    <div className="flex items-center gap-3 py-2">
      <ChevronDown className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
      <div className="w-32 flex items-center gap-1.5 flex-shrink-0">
        <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${statusDotColor[status]}`} />
        <span className="text-sm text-gray-700 font-medium truncate">{name}</span>
        {hint && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3 w-3 text-gray-300 flex-shrink-0 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-xs">{hint}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <div className="flex-1 flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${barColor[status]}`}
            style={{ width: `${score}%` }}
          />
        </div>
        <span className={`w-10 text-right text-sm font-semibold ${textColor[status]}`}>
          {score}%
        </span>
      </div>
    </div>
  );
}
