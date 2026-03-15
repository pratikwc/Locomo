"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SimpleProgress } from '@/components/simple-progress';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LoadingScreen } from '@/components/loading-screen';
import { GoogleConnectionCards } from '@/components/dashboard/google-connection-cards';
import { Download, TrendingUp, TrendingDown, Star, MessageSquare, Eye, Phone, Navigation, MousePointer, CircleAlert as AlertCircle, RefreshCw, Loader as Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface DashboardData {
  business: any;
  reviews: any[];
  profileCompleteness: number;
  totalReviews: number;
  averageRating: number;
  pendingReviews: number;
  healthScore: any;
  lastSynced: string | null;
}

interface LoadingStep {
  label: string;
  status: 'completed' | 'loading' | 'pending';
}

export default function DashboardPage() {
  const router = useRouter();
  const { hasGoogleAccount, loading: authLoading, checkGoogleConnection } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasGMBAccess, setHasGMBAccess] = useState(true);
  const [loadingSteps, setLoadingSteps] = useState<LoadingStep[]>([
    { label: 'Authentication verified', status: 'loading' },
    { label: 'Checking Google connection', status: 'pending' },
    { label: 'Loading locations', status: 'pending' },
  ]);
  const [loadingProgress, setLoadingProgress] = useState(33);
  const [showGoogleConnect, setShowGoogleConnect] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const hasFetchedRef = useRef(false);
  const hasCheckedSuccessRef = useRef(false);
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!hasCheckedSuccessRef.current) {
      hasCheckedSuccessRef.current = true;
      const params = new URLSearchParams(window.location.search);
      if (params.get('success') === 'google_connected') {
        checkGoogleConnection();
        window.history.replaceState({}, '', '/dashboard');
      }
    }
  }, [checkGoogleConnection]);

useEffect(() => {
  const initializeDashboard = async () => {
    if (authLoading) return;

    // If hasGoogleAccount is still null after auth loaded, treat as false
    const googleStatus = hasGoogleAccount ?? false;

    await new Promise(resolve => setTimeout(resolve, 500));
    setLoadingSteps(prev => prev.map((step, i) =>
      i === 0 ? { ...step, status: 'completed' } : step
    ));
    setLoadingProgress(67);

    await new Promise(resolve => setTimeout(resolve, 300));
    setLoadingSteps(prev => prev.map((step, i) =>
      i === 1 ? { ...step, status: 'loading' } : step
    ));

    if (!googleStatus) {
      setLoadingSteps(prev => prev.map((step, i) =>
        i === 1 ? { ...step, status: 'completed' } : step
      ));
      setLoadingProgress(100);
      setShowGoogleConnect(true);
      setLoading(false);
      return;
    }

    setLoadingSteps(prev => prev.map((step, i) =>
      i === 1 ? { ...step, status: 'completed' } : step
    ));
    setLoadingProgress(87);

    await new Promise(resolve => setTimeout(resolve, 300));
    setLoadingSteps(prev => prev.map((step, i) =>
      i === 2 ? { ...step, status: 'loading' } : step
    ));

    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      await fetchDashboardData();
    }

    setLoadingSteps(prev => prev.map((step, i) =>
      i === 2 ? { ...step, status: 'completed' } : step
    ));
    setLoadingProgress(100);
  };

  initializeDashboard();
}, [hasGoogleAccount, authLoading]);

  useEffect(() => {
    if (data && !loading) {
      autoRefreshIntervalRef.current = setInterval(() => {
        fetchDashboardData();
      }, 5 * 60 * 1000);
    }

    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, [data, loading]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const statusResponse = await fetch('/api/gmb/check-status');
      const statusData = await statusResponse.json();

      if (!statusData.has_gmb_access) {
        setHasGMBAccess(false);
        setLoading(false);
        return;
      }

      if (statusData.businesses && statusData.businesses.length > 0) {
        const businessId = statusData.businesses[0].id;

        const businessResponse = await fetch(`/api/businesses/${businessId}`);
        const businessData = await businessResponse.json();

        const reviewsResponse = await fetch(`/api/reviews?businessId=${businessId}`);
        const reviewsData = await reviewsResponse.json();

        const reviews = reviewsData.reviews || [];
        const totalReviews = reviews.length;
        const averageRating = totalReviews > 0
          ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / totalReviews
          : 0;
        const pendingReviews = reviews.filter((r: any) => r.reply_status === 'pending').length;

        const healthScoreResponse = await fetch(`/api/health-score?businessId=${businessId}`);
        const healthScoreData = await healthScoreResponse.json();

        setData({
          business: businessData,
          reviews: reviews.slice(0, 3),
          profileCompleteness: businessData.profile_completeness || 0,
          totalReviews,
          averageRating,
          pendingReviews,
          healthScore: healthScoreData.healthScore || null,
          lastSynced: businessData.last_synced_at || null,
        });
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    return 'Needs Improvement';
  };

  const handleManualSync = async () => {
    if (syncing) return;

    setSyncing(true);
    try {
      const response = await fetch('/api/sync/all', {
        method: 'POST',
      });

      const result = await response.json();

      if (response.ok) {
        await fetchDashboardData();
      } else {
        console.error('Sync failed:', result.error);
      }
    } catch (error) {
      console.error('Error during sync:', error);
    } finally {
      setSyncing(false);
    }
  };;

  if (loading) {
    return <LoadingScreen steps={loadingSteps} progress={loadingProgress} />;
  }

  if (showGoogleConnect) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <GoogleConnectionCards onConnectSuccess={checkGoogleConnection} />
      </div>
    );
  }

  if (!hasGMBAccess) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <AlertCircle className="h-16 w-16 mx-auto text-amber-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">No Google Business Profile Found</h2>
            <p className="text-slate-600 mb-6">
              You need a Google Business Profile to use this platform.
            </p>
            <Button onClick={() => router.push('/gmb-onboarding')}>
              Set Up Google Business Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <p className="text-slate-500 mb-4">No business data available.</p>
            <Button onClick={fetchDashboardData}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Data
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const healthScore = data.healthScore?.overall || Math.round(data.profileCompleteness);
  const profileScore = data.healthScore?.profileScore || data.profileCompleteness;
  const reviewScore = data.healthScore?.reviewScore || 0;
  const postScore = data.healthScore?.postScore || 0;
  const photoScore = data.healthScore?.photoScore || 0;
  const engagementScore = data.healthScore?.engagementScore || 0;

  const actionItems = data.healthScore?.actionItems || [];
  if (actionItems.length === 0) {
    if (data.pendingReviews > 0) {
      actionItems.push({
        title: `Respond to ${data.pendingReviews} pending review${data.pendingReviews > 1 ? 's' : ''}`,
        description: 'Improve customer engagement',
        priority: 'high',
        impact: 20,
      });
    }
    if (data.profileCompleteness < 100) {
      actionItems.push({
        title: 'Complete your business profile',
        description: 'Add missing information to improve visibility',
        priority: 'medium',
        impact: 15,
      });
    }
    if (actionItems.length === 0) {
      actionItems.push({
        title: 'Create weekly post',
        description: 'Keep your audience engaged',
        priority: 'low',
        impact: 10,
      });
    }
  }

  const stats = [
    {
      title: 'Profile Completeness',
      value: `${data.profileCompleteness}%`,
      change: '',
      trend: 'neutral',
      icon: Eye,
    },
    {
      title: 'Average Rating',
      value: data.averageRating > 0 ? data.averageRating.toFixed(1) : 'N/A',
      change: '',
      trend: 'neutral',
      icon: Star,
    },
    {
      title: 'Total Reviews',
      value: data.totalReviews.toString(),
      change: '',
      trend: 'neutral',
      icon: MessageSquare,
    },
    {
      title: 'Pending Reviews',
      value: data.pendingReviews.toString(),
      change: '',
      trend: 'neutral',
      icon: Phone,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Welcome back! Here's your business performance overview.
            {data.lastSynced && (
              <span className="text-xs ml-2">
                Last synced: {format(new Date(data.lastSynced), 'MMM d, h:mm a')}
              </span>
            )}
          </p>
        </div>
        <Button
          onClick={handleManualSync}
          disabled={syncing}
          variant="outline"
        >
          {syncing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync Now
            </>
          )}
        </Button>
      </div>

      <Card className="border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Google Health Score</CardTitle>
              <CardDescription className="mt-1">
                Overall profile health and optimization status
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Download Report
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-32 h-32 rounded-full border-8 border-gray-200 flex items-center justify-center">
                <div className={`text-4xl font-bold ${getScoreColor(healthScore)}`}>
                  {healthScore}
                </div>
              </div>
              <div className="absolute inset-0 rounded-full border-8 border-transparent border-t-blue-600 animate-spin-slow"></div>
            </div>

            <div className="flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">Profile</span>
                    <span className="text-sm font-medium">{profileScore}%</span>
                  </div>
                  <SimpleProgress value={profileScore} className="mb-3" />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">Reviews</span>
                    <span className="text-sm font-medium">{reviewScore}%</span>
                  </div>
                  <SimpleProgress value={reviewScore} className="mb-3" />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">Engagement</span>
                    <span className="text-sm font-medium">{engagementScore}%</span>
                  </div>
                  <SimpleProgress value={engagementScore} className="mb-3" />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">Posts</span>
                    <span className="text-sm font-medium">{postScore}%</span>
                  </div>
                  <SimpleProgress value={postScore} className="mb-3" />
                </div>
              </div>

              <div className="mt-2 p-3 bg-white rounded-lg border">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Overall Health</span>
                  <span className={`font-bold ${getScoreColor(healthScore)}`}>
                    {getScoreLabel(healthScore)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h3 className="font-semibold mb-3 flex items-center">
              <AlertCircle className="mr-2 h-5 w-5 text-blue-600" />
              Action Items to Improve Your Score
            </h3>
            <div className="grid gap-3">
              {actionItems.map((item: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border bg-white"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{item.title}</p>
                      <Badge
                        variant={
                          item.priority === 'high'
                            ? 'destructive'
                            : item.priority === 'medium'
                            ? 'default'
                            : 'secondary'
                        }
                        className="text-xs"
                      >
                        {item.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                  </div>
                  <Button size="sm" variant="ghost">
                    Take Action
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const TrendIcon = stat.trend === 'up' ? TrendingUp : TrendingDown;

          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
                <div className="flex items-center text-xs mt-1">
                  <TrendIcon
                    className={`mr-1 h-3 w-3 ${
                      stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                    }`}
                  />
                  <span
                    className={
                      stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                    }
                  >
                    {stat.change}
                  </span>
                  <span className="text-gray-500 ml-1">vs last month</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Reviews</CardTitle>
            <CardDescription>Latest customer feedback</CardDescription>
          </CardHeader>
          <CardContent>
            {data.reviews.length > 0 ? (
              <>
                <div className="space-y-4">
                  {data.reviews.map((review: any) => (
                    <div key={review.id} className="flex gap-3 pb-4 border-b last:border-0">
                      <Avatar className="w-10 h-10 flex-shrink-0">
                        <AvatarImage src={review.reviewer_photo_url || ''} />
                        <AvatarFallback>
                          {review.reviewer_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{review.reviewer_name}</p>
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-3 w-3 ${
                                  star <= review.rating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {review.review_text || 'No comment provided'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {format(new Date(review.review_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => router.push('/dashboard/reviews')}
                >
                  View All Reviews
                </Button>
              </>
            ) : (
              <div className="text-center py-8 text-slate-500">
                No reviews yet
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage your business profile</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <MessageSquare className="mr-2 h-4 w-4" />
              Create New Post
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Star className="mr-2 h-4 w-4" />
              Respond to Reviews
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <TrendingUp className="mr-2 h-4 w-4" />
              Generate Keywords
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Eye className="mr-2 h-4 w-4" />
              View Analytics
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
