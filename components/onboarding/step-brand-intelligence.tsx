"use client";

import { Button } from '@/components/ui/button';

interface StepBrandIntelligenceProps {
  workspaceData?: any;
  onNext: () => void;
  onSkip: () => void;
}

export function StepBrandIntelligence({ workspaceData, onNext, onSkip }: StepBrandIntelligenceProps) {
  return (
    <div className="space-y-6 text-center py-8">
      <p className="text-muted-foreground">
        AI will analyze your business to generate brand intelligence and messaging.
      </p>
      <div className="flex gap-3 justify-center">
        <Button onClick={onNext} size="lg">
          Generate Brand Intelligence
        </Button>
        <Button onClick={onSkip} variant="outline" size="lg">
          Skip
        </Button>
      </div>
    </div>
  );
}
