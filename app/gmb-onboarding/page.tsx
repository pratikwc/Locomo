"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CircleAlert as AlertCircle, CircleCheck as CheckCircle2, ExternalLink, RefreshCw, Store, Loader as Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SimpleProgress } from '@/components/simple-progress';
import { api } from '@/lib/api-client';

export default function GMBOnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [checking, setChecking] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [error, setError] = useState<any>(null);

  const verifyGMBAccess = async () => {
    setVerifying(true);
    setError(null);

    try {
      const { user } = await api.get<{ user: { id: string } }>('/api/auth/me');

      const verifyData = await api.post<{ hasGmbAccess: boolean }>('/api/gmb/verify-access', { userId: user.id });

      if (verifyData.hasGmbAccess) {
        await api.post('/api/gmb/sync-businesses');
        router.push('/dashboard?success=gmb_connected');
      } else {
        setStatus({ has_gmb_access: false, connected: true });
      }
    } catch (err: any) {
      console.error('Error verifying GMB access:', err);
      setError({ message: err.message || 'Failed to verify GMB access' });
    } finally {
      setVerifying(false);
    }
  };

  const checkStatus = async () => {
    setChecking(true);
    try {
      const data = await api.get<any>('/api/gmb/check-status');
      setStatus(data);

      if (data.has_gmb_access && data.businesses?.length > 0) {
        router.push('/dashboard?success=gmb_connected');
      }
    } catch (error) {
      console.error('Error checking status:', error);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    const justConnected = searchParams.get('success') === 'google_connected';

    if (justConnected) {
      // Automatically trigger verification after OAuth
      verifyGMBAccess();
    } else {
      checkStatus();
    }
  }, []);

  const steps = [
    {
      title: 'Create Your Google Business Profile',
      description: 'Visit Google Business Profile and create your free account',
      action: 'Create Profile',
      link: 'https://www.google.com/business/',
    },
    {
      title: 'Verify Your Business',
      description: 'Complete the verification process (usually takes 5-7 days)',
      info: 'Google will send a verification code via mail, phone, or email',
    },
    {
      title: 'Connect to Growmatiq',
      description: 'Once verified, return here and check connection',
    },
  ];

  return (
    <div className="min-h-screen bg-growmatiq-beige p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <Store className="h-16 w-16 mx-auto text-slate-700" />
          <h1 className="text-4xl font-bold text-slate-900">Set Up Google Business Profile</h1>
          <p className="text-slate-600 text-lg">
            Let's get your business on Google Maps and Search
          </p>
        </div>

        {verifying && (
          <Card className="border-growmatiq-taupe/30" style={{ backgroundColor: '#f0ebff' }}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#6931FF' }} />
                <div className="flex-1">
                  <h3 className="font-semibold mb-1" style={{ color: '#0d0a0b' }}>Verifying GMB Access...</h3>
                  <p className="text-sm" style={{ color: '#6931FF' }}>
                    Checking your Google Business Profile. This may take a few moments.
                  </p>
                  <SimpleProgress value={50} className="mt-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Verification Failed</AlertTitle>
            <AlertDescription>
              <p className="mb-2">{error.message}</p>
              {error.recoverySteps && error.recoverySteps.length > 0 && (
                <div className="mt-3">
                  <p className="font-semibold mb-2">To fix this:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    {error.recoverySteps.map((step: string, index: number) => (
                      <li key={index} className="text-sm">{step}</li>
                    ))}
                  </ol>
                </div>
              )}
              {error.retryAfter && (
                <div className="mt-3 p-2 bg-red-100 rounded text-sm">
                  You can retry in {Math.ceil(error.retryAfter / 60000)} minutes
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setError(null);
                  verifyGMBAccess();
                }}
                disabled={verifying}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {!status?.has_gmb_access && status?.connected && !verifying && (
          <Alert variant="default" className="border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-900">No Google Business Profile Found</AlertTitle>
            <AlertDescription className="text-amber-800">
              We couldn't find a Google Business Profile linked to your account. Follow the steps below to create one.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Why You Need a Google Business Profile</CardTitle>
            <CardDescription>
              Your free Business Profile on Google helps you drive customer engagement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Store className="h-6 w-6 text-slate-700" />
                </div>
                <h3 className="font-semibold text-slate-900">Be Discovered</h3>
                <p className="text-sm text-slate-600">
                  Appear on Google Maps and Search when customers look for businesses like yours
                </p>
              </div>
              <div className="space-y-2">
                <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-slate-700" />
                </div>
                <h3 className="font-semibold text-slate-900">Build Trust</h3>
                <p className="text-sm text-slate-600">
                  Collect and respond to customer reviews to build credibility
                </p>
              </div>
              <div className="space-y-2">
                <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center">
                  <ExternalLink className="h-6 w-6 text-slate-700" />
                </div>
                <h3 className="font-semibold text-slate-900">Drive Actions</h3>
                <p className="text-sm text-slate-600">
                  Let customers call, visit your website, or get directions instantly
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Get Started in 3 Steps</CardTitle>
            <CardDescription>
              Setting up your Business Profile is free and takes just a few minutes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {steps.map((step, index) => (
                <div key={index} className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full text-growmatiq-beige flex items-center justify-center font-semibold" style={{ backgroundColor: '#6931FF' }}>
                      {index + 1}
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <h3 className="font-semibold text-slate-900">{step.title}</h3>
                    <p className="text-slate-600">{step.description}</p>
                    {step.info && (
                      <p className="text-sm text-slate-500 italic">{step.info}</p>
                    )}
                    {step.link && (
                      <Button
                        variant="outline"
                        className="mt-2"
                        onClick={() => window.open(step.link, '_blank')}
                      >
                        {step.action}
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-slate-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h3 className="font-semibold text-slate-900">Already Have a Business Profile?</h3>
              <p className="text-slate-600">
                Click below to check if your account is now connected
              </p>
              <Button
                onClick={verifyGMBAccess}
                disabled={checking || verifying}
                size="lg"
                style={{ backgroundColor: '#6931FF' }} className="hover:opacity-90"
              >
                {checking || verifying ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Verify Connection
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard')}
            className="text-slate-600"
          >
            Skip for Now
          </Button>
        </div>
      </div>
    </div>
  );
}
