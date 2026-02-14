"use client";

interface SimpleProgressProps {
  value: number;
  className?: string;
}

export function SimpleProgress({ value, className = '' }: SimpleProgressProps) {
  return (
    <div className={`h-2 w-full bg-gray-200 rounded-full overflow-hidden ${className}`}>
      <div
        className="h-full bg-blue-600 transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
