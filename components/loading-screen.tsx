"use client";

import { CheckCircle2, Loader2, Circle } from 'lucide-react';
import { SimpleProgress } from '@/components/simple-progress';

interface LoadingStep {
  label: string;
  status: 'completed' | 'loading' | 'pending';
}

interface LoadingScreenProps {
  steps: LoadingStep[];
  progress: number;
  title?: string;
  subtitle?: string;
}

export function LoadingScreen({ steps, progress, title = "Loading Local SEO", subtitle = "Setting up your dashboard" }: LoadingScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center">
              <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
            <p className="text-gray-500 text-sm">{subtitle}</p>
          </div>

          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center gap-3">
                {step.status === 'completed' && (
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                )}
                {step.status === 'loading' && (
                  <Loader2 className="h-5 w-5 text-blue-600 animate-spin flex-shrink-0" />
                )}
                {step.status === 'pending' && (
                  <Circle className="h-5 w-5 text-gray-300 flex-shrink-0" />
                )}
                <span className={`text-sm font-medium ${
                  step.status === 'completed'
                    ? 'text-green-600'
                    : step.status === 'loading'
                    ? 'text-gray-900'
                    : 'text-gray-400'
                }`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-4">
            <SimpleProgress value={progress} className="h-2" />
            <p className="text-center text-sm text-gray-500 mt-2">{progress}% complete</p>
          </div>
        </div>
      </div>
    </div>
  );
}
