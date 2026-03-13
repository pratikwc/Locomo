"use client";

import { Button } from '@/components/ui/button';

interface StepSelectLocationsProps {
  onNext: () => void;
  onSkip: () => void;
}

export function StepSelectLocations({ onNext, onSkip }: StepSelectLocationsProps) {
  return (
    <div className="space-y-6 text-center py-8">
      <p className="text-muted-foreground">
        This step will fetch and display your Google Business Profile locations for selection.
      </p>
      <div className="flex gap-3 justify-center">
        <Button onClick={onNext} size="lg">
          Continue
        </Button>
        <Button onClick={onSkip} variant="outline" size="lg">
          Skip
        </Button>
      </div>
    </div>
  );
}
