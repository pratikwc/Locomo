"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useWorkspace } from '@/contexts/workspace-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader as Loader2, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { StepCreateWorkspace } from '@/components/onboarding/step-create-workspace';
import { StepConnectGoogle } from '@/components/onboarding/step-connect-google';
import { StepSelectLocations } from '@/components/onboarding/step-select-locations';
import { StepBrandIntelligence } from '@/components/onboarding/step-brand-intelligence';
import { StepAgentConfiguration } from '@/components/onboarding/step-agent-configuration';
import { StepComplete } from '@/components/onboarding/step-complete';

type OnboardingStep =
  | 'create_workspace'
  | 'connect_google'
  | 'select_locations'
  | 'brand_intelligence'
  | 'agent_configuration'
  | 'complete';

const steps: { id: OnboardingStep; title: string; description: string }[] = [
  { id: 'create_workspace', title: 'Create Workspace', description: 'Set up your workspace' },
  { id: 'connect_google', title: 'Connect Google', description: 'Link your Google Account' },
  { id: 'select_locations', title: 'Select Locations', description: 'Choose locations to manage' },
  { id: 'brand_intelligence', title: 'Brand Intelligence', description: 'Generate brand profile' },
  { id: 'agent_configuration', title: 'AI Agents', description: 'Configure AI automation' },
  { id: 'complete', title: 'Complete', description: 'Finish setup' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { workspace, refreshWorkspace } = useWorkspace();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<OnboardingStep>>(new Set());
  const [stepData, setStepData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (workspace) {
      setCurrentStepIndex(1);
      setCompletedSteps(prev => new Set(prev).add('create_workspace'));
    }
  }, [workspace]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const currentStep = steps[currentStepIndex];
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleNext = async (data?: any) => {
    if (data) {
      setStepData(prev => ({ ...prev, [currentStep.id]: data }));
    }

    setCompletedSteps(prev => new Set(prev).add(currentStep.id));

    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handleComplete = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center p-6">
      <div className="w-full max-w-5xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-foreground">G</span>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              Welcome to Growmatiq
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Let&apos;s set up your multi-location growth platform
          </p>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className="flex items-center"
              >
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                      index < currentStepIndex
                        ? 'bg-primary border-primary text-primary-foreground'
                        : index === currentStepIndex
                        ? 'border-primary text-primary'
                        : 'border-muted text-muted-foreground'
                    }`}
                  >
                    {completedSteps.has(step.id) ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <span className="text-sm font-semibold">{index + 1}</span>
                    )}
                  </div>
                  <p className={`text-xs mt-2 font-medium hidden md:block ${
                    index === currentStepIndex ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-12 md:w-24 h-0.5 mx-2 transition-colors ${
                      index < currentStepIndex ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card className="p-8 shadow-xl">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">{currentStep.title}</h2>
            <p className="text-muted-foreground">{currentStep.description}</p>
          </div>

          <div className="min-h-[400px]">
            {currentStep.id === 'create_workspace' && (
              <StepCreateWorkspace onNext={handleNext} />
            )}
            {currentStep.id === 'connect_google' && (
              <StepConnectGoogle onNext={handleNext} onSkip={handleSkip} />
            )}
            {currentStep.id === 'select_locations' && (
              <StepSelectLocations onNext={handleNext} onSkip={handleSkip} />
            )}
            {currentStep.id === 'brand_intelligence' && (
              <StepBrandIntelligence
                workspaceData={stepData.create_workspace}
                onNext={handleNext}
                onSkip={handleSkip}
              />
            )}
            {currentStep.id === 'agent_configuration' && (
              <StepAgentConfiguration onNext={handleNext} onSkip={handleSkip} />
            )}
            {currentStep.id === 'complete' && (
              <StepComplete onComplete={handleComplete} />
            )}
          </div>

          {currentStep.id !== 'complete' && (
            <div className="flex items-center justify-between mt-8 pt-6 border-t">
              <Button
                variant="ghost"
                onClick={handleBack}
                disabled={currentStepIndex === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className="flex gap-2">
                {currentStepIndex > 0 && currentStepIndex < steps.length - 1 && (
                  <Button variant="outline" onClick={handleSkip}>
                    Skip
                  </Button>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
