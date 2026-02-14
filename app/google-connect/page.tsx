"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2 } from 'lucide-react';

export default function GoogleConnectPage() {
  const router = useRouter();
  const { user, loading: authLoading, hasGoogleAccount } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
      return;
    }

    if (!authLoading && user && hasGoogleAccount === true && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      router.replace('/dashboard');
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get('error');
    const messageParam = params.get('message');

    if (errorParam) {
      const errorMessages: Record<string, string> = {
        'missing_params': 'Authorization failed: Missing required parameters',
        'invalid_state': messageParam || 'Authorization failed: Invalid or expired state',
        'oauth_error': messageParam || 'Google authorization was denied or failed',
        'auth_failed': messageParam || 'Failed to connect your Google account',
        'account_in_use': 'This Google account is already associated with another user',
      };
      setError(errorMessages[errorParam] || 'An unknown error occurred');
      window.history.replaceState({}, '', '/google-connect');
    }
  }, [user, authLoading, hasGoogleAccount, router]);

  const handleConnectGoogle = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/google/auth-url');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to get authorization URL');
      }

      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        setError('Failed to get Google authorization URL');
      }
    } catch (err: any) {
      console.error('Connect Google error:', err);
      setError(err.message || 'Failed to initiate Google connection');
      setLoading(false);
    }
  };

  if (authLoading || hasGoogleAccount === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center">
              <span className="text-2xl font-bold text-white">G</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            Connect Your Google Account
          </CardTitle>
          <CardDescription className="text-center">
            Connect your Google My Business account to start managing your profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {hasGoogleAccount === true ? (
            <div className="flex flex-col items-center space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-600" />
              <p className="text-center text-gray-600">
                Your Google account is connected!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                <h3 className="font-semibold text-blue-900">What we'll access:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Your Google Business Profile information</li>
                  <li>• Customer reviews and ratings</li>
                  <li>• Posts and updates</li>
                  <li>• Performance insights and analytics</li>
                </ul>
              </div>

              <Button
                onClick={handleConnectGoogle}
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Connect with Google
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
