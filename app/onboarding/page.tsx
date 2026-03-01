"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingScreen } from '@/components/loading-screen';

interface LoadingStep {
  label: string;
  status: 'completed' | 'loading' | 'pending';
}

export default function OnboardingPage() {
  const router = useRouter();
  const [steps, setSteps] = useState<LoadingStep[]>([
    { label: 'Authentication verified', status: 'loading' },
    { label: 'Checking Google connection', status: 'pending' },
    { label: 'Loading locations', status: 'pending' },
  ]);
  const [progress, setProgress] = useState(33);

  useEffect(() => {
    const initializeOnboarding = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setSteps(prev => prev.map((step, i) =>
          i === 0 ? { ...step, status: 'completed' } : step
        ));
        setProgress(67);

        await new Promise(resolve => setTimeout(resolve, 500));
        setSteps(prev => prev.map((step, i) =>
          i === 1 ? { ...step, status: 'loading' } : step
        ));

        const response = await fetch('/api/google/check-connection');
        const data = await response.json();

        if (!data.connected) {
          router.replace('/google-connect');
          return;
        }

        setSteps(prev => prev.map((step, i) =>
          i === 1 ? { ...step, status: 'completed' } : step
        ));
        setProgress(87);

        await new Promise(resolve => setTimeout(resolve, 500));
        setSteps(prev => prev.map((step, i) =>
          i === 2 ? { ...step, status: 'loading' } : step
        ));

        const statusResponse = await fetch('/api/gmb/check-status');
        const statusData = await statusResponse.json();

        setSteps(prev => prev.map((step, i) =>
          i === 2 ? { ...step, status: 'completed' } : step
        ));
        setProgress(100);

        await new Promise(resolve => setTimeout(resolve, 500));

        if (!statusData.has_gmb_access) {
          router.replace('/gmb-onboarding');
        } else {
          router.replace('/dashboard');
        }
      } catch (error) {
        console.error('Onboarding error:', error);
        router.replace('/dashboard');
      }
    };

    initializeOnboarding();
  }, [router]);

  return <LoadingScreen steps={steps} progress={progress} />;
}
