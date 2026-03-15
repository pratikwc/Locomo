"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Star, Sparkles, Send, Search, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface Review {
  id: string;
  reviewer_name: string;
  reviewer_photo_url: string | null;
  rating: number;
  review_text: string;
  review_date: string;
  reply_text: string | null;
  reply_status: 'pending' | 'replied' | 'ignored';
  ai_suggested_reply: string | null;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
}

const SYNC_INTERVAL_MS = 5 * 60 * 1000;

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [newReviewIds, setNewReviewIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchReviews = useCallback(async (bizId?: string) => {
    try {
      const id = bizId || businessId;
      if (!id) return;

      const reviewsResponse = await fetch(`/api/reviews?businessId=${id}`);
      const reviewsData = await reviewsResponse.json();
      setReviews(reviewsData.reviews || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  }, [businessId]);

  const subscribeToReviews = useCallback((bizId: string) => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`reviews:${bizId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reviews',
          filter: `business_id=eq.${bizId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newReview = payload.new as Review;
            setReviews((prev) => {
              if (prev.find((r) => r.id === newReview.id)) return prev;
              return [newReview, ...prev];
            });
            setNewReviewIds((prev) => new Set(prev).add(newReview.id));
            setTimeout(() => {
              setNewReviewIds((prev) => {
                const next = new Set(prev);
                next.delete(newReview.id);
                return next;
              });
            }, 4000);
            toast({
              title: 'New Review',
              description: `${newReview.reviewer_name} left a ${newReview.rating}-star review`,
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Review;
            setReviews((prev) =>
              prev.map((r) => (r.id === updated.id ? updated : r))
            );
          } else if (payload.eventType === 'DELETE') {
            setReviews((prev) => prev.filter((r) => r.id !== payload.old.id));
          }
        }
      )
      .subscribe((status) => {
        setIsLive(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;
  }, [toast]);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const statusResponse = await fetch('/api/gmb/check-status');
        const statusData = await statusResponse.json();

        if (statusData.businesses && statusData.businesses.length > 0) {
          const bizId = statusData.businesses[0].id;
          setBusinessId(bizId);
          await fetchReviewsById(bizId);
          subscribeToReviews(bizId);
          startAutoSync(bizId);
        }
      } catch (error) {
        console.error('Error initializing reviews:', error);
        toast({
          title: 'Error',
          description: 'Failed to load reviews',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    init();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, []);

  const fetchReviewsById = async (bizId: string) => {
    const reviewsResponse = await fetch(`/api/reviews?businessId=${bizId}`);
    const reviewsData = await reviewsResponse.json();
    setReviews(reviewsData.reviews || []);
  };

  const startAutoSync = (bizId: string) => {
    if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    syncIntervalRef.current = setInterval(async () => {
      try {
        await fetch('/api/gmb/sync-reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId: bizId }),
        });
      } catch (err) {
        console.error('[Auto-sync] Failed:', err);
      }
    }, SYNC_INTERVAL_MS);
  };

  const handleGenerateAIReply = async (review: Review) => {
    setLoadingAI(true);
    try {
      const response = await fetch('/api/ai/generate-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewText: review.review_text,
          rating: review.rating,
          reviewerName: review.reviewer_name,
        }),
      });

      const data = await response.json();

      if (data.reply) {
        setReplyText(data.reply);
        setReviews(reviews.map(r =>
          r.id === review.id ? { ...r, ai_suggested_reply: data.reply } : r
        ));
      }
    } catch (error) {
      console.error('Error generating AI reply:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate AI reply',
        variant: 'destructive',
      });
    } finally {
      setLoadingAI(false);
    }
  };

  const handleSubmitReply = async () => {
    if (!selectedReview || !replyText.trim()) return;

    setSubmitting(true);
    try {
      toast({
        title: 'Success',
        description: 'Reply posted successfully',
      });

      setReviews(reviews.map(r =>
        r.id === selectedReview.id
          ? { ...r, reply_text: replyText, reply_status: 'replied' }
          : r
      ));

      setSelectedReview(null);
      setReplyText('');
    } catch (error) {
      console.error('Error submitting reply:', error);
      toast({
        title: 'Error',
        description: 'Failed to post reply',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSyncReviews = async () => {
    if (!businessId) return;

    setSyncing(true);
    try {
      const response = await fetch('/api/gmb/sync-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Sync Complete',
          description: data.message,
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: 'Sync Failed',
        description: error.message || 'Failed to sync reviews',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  const openReplyDialog = (review: Review) => {
    setSelectedReview(review);
    setReplyText(review.ai_suggested_reply || review.reply_text || '');
  };

  const filteredReviews = reviews.filter((review) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'pending' && review.reply_status === 'pending') ||
      (filter === 'replied' && review.reply_status === 'replied');

    const matchesSearch =
      !searchQuery ||
      review.reviewer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (review.review_text || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const stats = {
    average: (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length || 0).toFixed(1),
    total: reviews.length,
    pending: reviews.filter((r) => r.reply_status === 'pending').length,
    responseRate: reviews.length
      ? Math.round(
          (reviews.filter((r) => r.reply_status === 'replied').length / reviews.length) * 100
        )
      : 0,
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-slate-300 border-t-slate-900 rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reviews</h1>
          <p className="text-gray-500 mt-1">Manage and respond to customer reviews</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            {isLive ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-600">Live</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-gray-400" />
                <span className="text-gray-400">Offline</span>
              </>
            )}
          </div>
          <Button onClick={handleSyncReviews} disabled={syncing} variant="outline" size="sm">
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.average}</div>
            <p className="text-sm text-gray-500 mt-1">Average Rating</p>
            <div className="flex mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    star <= Math.round(parseFloat(stats.average))
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-gray-500 mt-1">Total Reviews</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-sm text-gray-500 mt-1">Pending Replies</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.responseRate}%</div>
            <p className="text-sm text-gray-500 mt-1">Response Rate</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Reviews</CardTitle>
              <CardDescription>View and respond to customer feedback in real time</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search reviews..."
                  className="pl-8 w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList>
              <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
              <TabsTrigger value="pending">
                Pending ({stats.pending})
              </TabsTrigger>
              <TabsTrigger value="replied">Replied</TabsTrigger>
            </TabsList>

            <TabsContent value={filter} className="mt-6">
              {filteredReviews.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Star className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">No reviews found</p>
                  <p className="text-sm mt-1">
                    {reviews.length === 0
                      ? 'Sync your reviews to get started'
                      : 'Try adjusting your filters'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredReviews.map((review) => (
                    <div
                      key={review.id}
                      className={`border rounded-lg p-4 space-y-3 transition-all duration-500 ${
                        newReviewIds.has(review.id)
                          ? 'border-emerald-400 bg-emerald-50 shadow-sm'
                          : 'hover:border-blue-200'
                      }`}
                    >
                      {newReviewIds.has(review.id) && (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                          </span>
                          New review
                        </div>
                      )}
                      <div className="flex items-start justify-between">
                        <div className="flex gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white font-semibold flex-shrink-0">
                            {review.reviewer_name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">{review.reviewer_name}</p>
                              {review.sentiment && (
                                <Badge
                                  variant={
                                    review.sentiment === 'positive'
                                      ? 'default'
                                      : review.sentiment === 'negative'
                                      ? 'destructive'
                                      : 'secondary'
                                  }
                                  className="text-xs"
                                >
                                  {review.sentiment}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-4 w-4 ${
                                      star <= review.rating
                                        ? 'fill-yellow-400 text-yellow-400'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-sm text-gray-500">
                                {new Date(review.review_date).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        {review.reply_status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => openReplyDialog(review)}
                          >
                            <Sparkles className="mr-2 h-4 w-4" />
                            Reply
                          </Button>
                        )}
                      </div>

                      {review.review_text && (
                        <p className="text-gray-700">{review.review_text}</p>
                      )}

                      {review.reply_text && (
                        <div className="bg-blue-50 border-l-4 border-blue-600 p-3 rounded">
                          <p className="text-sm font-semibold text-blue-900 mb-1">
                            Your Reply
                          </p>
                          <p className="text-sm text-gray-700">{review.reply_text}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog
        open={!!selectedReview}
        onOpenChange={(open) => !open && setSelectedReview(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reply to Review</DialogTitle>
            <DialogDescription>
              Write a thoughtful response to {selectedReview?.reviewer_name}'s review
            </DialogDescription>
          </DialogHeader>

          {selectedReview && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= selectedReview.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-semibold">
                    {selectedReview.reviewer_name}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{selectedReview.review_text}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Your Reply</label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGenerateAIReply(selectedReview)}
                    disabled={loadingAI}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    {loadingAI ? 'Generating...' : 'Generate with AI'}
                  </Button>
                </div>
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write your reply here..."
                  rows={6}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500">
                  Be professional, empathetic, and address the customer's concerns.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedReview(null)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitReply} disabled={submitting || !replyText.trim()}>
              {submitting ? (
                'Posting...'
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Post Reply
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
