"use client";

import { Button } from '@/components/ui/button';

interface StepAgentConfigurationProps {
  onNext: () => void;
  onSkip: () => void;
}

export function StepAgentConfiguration({ onNext, onSkip }: StepAgentConfigurationProps) {
  return (
    <div className="space-y-6 text-center py-8">
      <p className="text-muted-foreground">
        Configure AI agents for automated reviews, content generation, and more.
      </p>
      <div className="flex gap-3 justify-center">
        <Button onClick={onNext} size="lg">
          Configure Agents
        </Button>
        <Button onClick={onSkip} variant="outline" size="lg">
          Skip
        </Button>
      </div>
    </div>
  );
}
