"use client";

import { CircleAlert as AlertCircle, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle2, Info } from 'lucide-react';

type Priority = 'critical' | 'high' | 'medium' | 'low';

interface QuickWinItemProps {
  title: string;
  description: string;
  priority: Priority;
  action?: string;
  onAction?: () => void;
}

const priorityConfig: Record<Priority, { icon: typeof AlertCircle; bg: string; iconColor: string; border: string }> = {
  critical: {
    icon: AlertCircle,
    bg: 'bg-red-50',
    iconColor: 'text-red-500',
    border: 'border-red-100',
  },
  high: {
    icon: AlertCircle,
    bg: 'bg-red-50',
    iconColor: 'text-red-400',
    border: 'border-red-100',
  },
  medium: {
    icon: AlertTriangle,
    bg: 'bg-yellow-50',
    iconColor: 'text-yellow-500',
    border: 'border-yellow-100',
  },
  low: {
    icon: Info,
    bg: 'bg-blue-50',
    iconColor: 'text-blue-400',
    border: 'border-blue-100',
  },
};

export function QuickWinItem({ title, description, priority, action, onAction }: QuickWinItemProps) {
  const { icon: Icon, bg, iconColor, border } = priorityConfig[priority];

  return (
    <div className={`flex items-start gap-3 p-3.5 rounded-lg ${bg} border ${border}`}>
      <Icon className={`h-4 w-4 ${iconColor} flex-shrink-0 mt-0.5`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-gray-800">{title}</p>
          {action && (
            <button
              onClick={onAction}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex-shrink-0 underline"
            >
              {action}
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
    </div>
  );
}
