"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, ExternalLink, RefreshCw, Store } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function GMBOnboardingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<any>(null);

  const checkStatus = async () => {
    setChecking(true);
    try {
      const response = await fetch('/api/gmb/check-status');
      const data = await response.json();
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
    checkStatus();
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
      title: 'Connect to Locomo',
      description: 'Once verified, return here and check connection',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <Store className="h-16 w-16 mx-auto text-slate-700" />
          <h1 className="text-4xl font-bold text-slate-900">Set Up Google Business Profile</h1>
          <p className="text-slate-600 text-lg">
            Let's get your business on Google Maps and Search
          </p>
        </div>

        {!status?.has_gmb_access && status?.connected && (
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
                    <div className="h-10 w-10 rounded-full bg-slate-700 text-white flex items-center justify-center font-semibold">
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
                onClick={checkStatus}
                disabled={checking}
                size="lg"
                className="bg-slate-900 hover:bg-slate-800"
              >
                {checking ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Check Connection
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
