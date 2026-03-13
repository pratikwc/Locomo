"use client";

import { Button } from '@/components/ui/button';
import { Check, Sparkles } from 'lucide-react';

interface StepCompleteProps {
  onComplete: () => void;
}

export function StepComplete({ onComplete }: StepCompleteProps) {
  return (
    <div className="space-y-6 text-center py-8">
      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
        <Check className="h-10 w-10 text-primary" />
      </div>
      <h3 className="text-2xl font-bold">You&apos;re All Set!</h3>
      <p className="text-muted-foreground text-lg max-w-md mx-auto">
        Your Growmatiq workspace is ready. Start managing your locations, reviews, and grow your local presence with AI.
      </p>
      <Button onClick={onComplete} size="lg" className="mt-6">
        <Sparkles className="h-4 w-4 mr-2" />
        Go to Dashboard
      </Button>
    </div>
  );
}
