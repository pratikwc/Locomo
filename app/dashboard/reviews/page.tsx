"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Star, Sparkles, Send, Search, RefreshCw, WifiOff, Loader as Loader2, MessageSquare, CircleCheck as CheckCircle2, Clock, CircleAlert as AlertCircle, ThumbsUp, ThumbsDown, Minus, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Review {
  id: string;
  reviewer_name: string;
  reviewer_photo_url: string | null;
  rating: number;
  review_text: string | null;
  review_date: string;
  reply_text: string | null;
  reply_status: 'pending' | 'replied' | 'ignored';
  ai_suggested_reply: string | null;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
}

const SYNC_INTERVAL_MS = 5 * 60 * 1000;

function ratingDistribution(reviews: Review[]) {
  const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach(r => { dist[r.rating] = (dist[r.rating] || 0) + 1; });
  return dist;
}

function StarDisplay({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const cls = size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5';
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={`${cls} ${s <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
      ))}
    </div>
  );
}

function SentimentBadge({ sentiment }: { sentiment: Review['sentiment'] }) {
  if (sentiment === 'positive') return (
    <span className="flex items-center gap-1 text-xs text-green-600">
      <ThumbsUp className="h-3 w-3" /> positive
    </span>
  );
  if (sentiment === 'negative') return (
    <span className="flex items-center gap-1 text-xs text-red-500">
      <ThumbsDown className="h-3 w-3" /> negative
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-xs text-gray-400">
      <Minus className="h-3 w-3" /> neutral
    </span>
  );
}

function ReviewerAvatar({ name }: { name: string }) {
  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const palettes = [
    'from-blue-400 to-cyan-400',
    'from-emerald-400 to-teal-400',
    'from-amber-400 to-orange-400',
    'from-rose-400 to-pink-400',
    'from-sky-400 to-blue-400',
  ];
  const color = palettes[name.charCodeAt(0) % palettes.length];
  return (
    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white text-sm font-bold flex-shrink-0 select-none`}>
      {initials}
    </div>
  );
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [newReviewIds, setNewReviewIds] = useState<Set<string>>(new Set());
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchReviewsById = useCallback(async (bizId: string) => {
    try {
      const res = await fetch(`/api/reviews?businessId=${bizId}`);
      const data = await res.json();
      if (res.ok) setReviews(data.reviews || []);
    } catch {
      console.error('Error fetching reviews');
    }
  }, []);

  const subscribeToReviews = useCallback((bizId: string) => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const channel = supabase
      .channel(`reviews:${bizId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reviews', filter: `business_id=eq.${bizId}` },
        payload => {
          if (payload.eventType === 'INSERT') {
            const r = payload.new as Review;
            setReviews(prev => prev.find(x => x.id === r.id) ? prev : [r, ...prev]);
            setNewReviewIds(prev => new Set(prev).add(r.id));
            setTimeout(() => {
              setNewReviewIds(prev => { const n = new Set(prev); n.delete(r.id); return n; });
            }, 4000);
            toast({ title: 'New Review', description: `${r.reviewer_name} left a ${r.rating}-star review` });
          } else if (payload.eventType === 'UPDATE') {
            const r = payload.new as Review;
            setReviews(prev => prev.map(x => x.id === r.id ? r : x));
          } else if (payload.eventType === 'DELETE') {
            setReviews(prev => prev.filter(x => x.id !== payload.old.id));
          }
        }
      )
      .subscribe(status => setIsLive(status === 'SUBSCRIBED'));

    channelRef.current = channel;
  }, [toast]);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const statusRes = await fetch('/api/gmb/check-status');
        const statusData = await statusRes.json();

        if (statusData.businesses?.length > 0) {
          const bizId = statusData.businesses[0].id;
          setBusinessId(bizId);
          await fetchReviewsById(bizId);
          subscribeToReviews(bizId);
          syncIntervalRef.current = setInterval(async () => {
            await fetch('/api/gmb/sync-reviews', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ businessId: bizId }),
            });
          }, SYNC_INTERVAL_MS);
        }
      } catch {
        toast({ title: 'Error', description: 'Failed to load reviews', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    init();
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [fetchReviewsById, subscribeToReviews, toast]);

  const handleGenerateAIReply = async (review: Review) => {
    setLoadingAI(true);
    try {
      const res = await fetch('/api/ai/generate-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewText: review.review_text, rating: review.rating, reviewerName: review.reviewer_name }),
      });
      const data = await res.json();
      if (data.reply) setReplyText(data.reply);
    } catch {
      toast({ title: 'Error', description: 'Failed to generate AI reply', variant: 'destructive' });
    } finally {
      setLoadingAI(false);
    }
  };

  const handleSubmitReply = async () => {
    if (!selectedReview || !replyText.trim() || !businessId) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId: selectedReview.id, replyText: replyText.trim(), businessId }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to save reply');
      }
      setReviews(prev =>
        prev.map(r => r.id === selectedReview.id
          ? { ...r, reply_text: replyText.trim(), reply_status: 'replied' }
          : r
        )
      );
      toast({ title: 'Reply Saved', description: 'Your reply has been saved successfully.' });
      setSelectedReview(null);
      setReplyText('');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to save reply', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSyncReviews = async () => {
    if (!businessId) return;
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch('/api/gmb/sync-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchReviewsById(businessId);
        toast({ title: 'Sync Complete', description: data.message || `Synced ${data.synced ?? 0} review(s)` });
      } else {
        const msg = data.error || 'Sync failed';
        setSyncError(msg);
        toast({ title: 'Sync Failed', description: msg, variant: 'destructive' });
      }
    } catch {
      const msg = 'Could not reach Google. Check your internet connection.';
      setSyncError(msg);
      toast({ title: 'Sync Failed', description: msg, variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  const openReplyDialog = (review: Review) => {
    setSelectedReview(review);
    setReplyText(review.reply_text || '');
  };

  const toggleReply = (id: string) => {
    setExpandedReplies(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const filteredReviews = reviews.filter(r => {
    const matchFilter =
      filter === 'all' ||
      (filter === 'pending' && r.reply_status === 'pending') ||
      (filter === 'replied' && r.reply_status === 'replied');
    const matchSearch =
      !searchQuery ||
      r.reviewer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.review_text || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchFilter && matchSearch;
  });

  const dist = ratingDistribution(reviews);
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const pendingCount = reviews.filter(r => r.reply_status === 'pending').length;
  const repliedCount = reviews.filter(r => r.reply_status === 'replied').length;
  const responseRate = reviews.length ? Math.round((repliedCount / reviews.length) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1100px] mx-auto px-4 py-6 space-y-5">

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage and respond to customer reviews</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-medium">
              {isLive ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="text-emerald-600">Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-gray-400">Offline</span>
                </>
              )}
            </div>
            <Button onClick={handleSyncReviews} disabled={syncing} variant="outline" size="sm">
              {syncing
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Syncing...</>
                : <><RefreshCw className="mr-2 h-4 w-4" />Sync Reviews</>
              }
            </Button>
          </div>
        </div>

        {syncError && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-red-500" />
            <div>
              <p className="text-sm font-semibold text-red-700">Sync failed</p>
              <p className="text-xs text-red-600 mt-0.5">{syncError}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 col-span-2 lg:col-span-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Average Rating</p>
            <div className="flex items-end gap-2 mb-3">
              <span className="text-4xl font-bold text-gray-900">{avgRating.toFixed(1)}</span>
              <div className="mb-1">
                <StarDisplay rating={Math.round(avgRating)} size="md" />
                <p className="text-xs text-gray-400 mt-0.5">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="space-y-1">
              {[5, 4, 3, 2, 1].map(star => {
                const count = dist[star] || 0;
                const pct = reviews.length ? (count / reviews.length) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-400 w-2 flex-shrink-0">{star}</span>
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-400 w-4 text-right flex-shrink-0">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col justify-center">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Reviews</p>
            <p className="text-3xl font-bold text-gray-900">{reviews.length}</p>
            <p className="text-xs text-gray-400 mt-1">All time</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col justify-center">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Pending Replies</p>
            <p className={`text-3xl font-bold ${pendingCount > 0 ? 'text-amber-600' : 'text-gray-900'}`}>{pendingCount}</p>
            <p className="text-xs text-gray-400 mt-1">Awaiting response</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col justify-center">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Response Rate</p>
            <p className={`text-3xl font-bold ${responseRate >= 50 ? 'text-green-600' : 'text-red-500'}`}>{responseRate}%</p>
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${responseRate >= 50 ? 'bg-green-500' : 'bg-red-400'}`}
                style={{ width: `${responseRate}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-sm font-bold text-gray-900">All Reviews</h2>
              <p className="text-xs text-gray-400 mt-0.5">View and respond to customer feedback in real time</p>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <Input
                placeholder="Search reviews..."
                className="pl-8 w-52 h-8 text-sm"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="px-4 pt-3 pb-4">
            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList className="h-8">
                <TabsTrigger value="all" className="text-xs px-3">All ({reviews.length})</TabsTrigger>
                <TabsTrigger value="pending" className="text-xs px-3 flex items-center gap-1.5">
                  Pending ({pendingCount})
                  {pendingCount > 0 && (
                    <span className="h-4 w-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                      {pendingCount > 9 ? '9+' : pendingCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="replied" className="text-xs px-3">Replied ({repliedCount})</TabsTrigger>
              </TabsList>

              <TabsContent value={filter} className="mt-0">
                {filteredReviews.length === 0 ? (
                  <div className="text-center py-16">
                    <Star className="h-10 w-10 mx-auto mb-3 text-gray-200" />
                    <p className="font-medium text-gray-500">No reviews found</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {reviews.length === 0
                        ? 'Click "Sync Reviews" to import from Google'
                        : 'Try adjusting your filters'}
                    </p>
                    {reviews.length === 0 && (
                      <Button onClick={handleSyncReviews} disabled={syncing} size="sm" className="mt-4">
                        <RefreshCw className="mr-2 h-4 w-4" />Sync Reviews Now
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50 mt-1">
                    {filteredReviews.map(review => {
                      const expanded = expandedReplies.has(review.id);
                      return (
                        <div
                          key={review.id}
                          className={`py-4 transition-colors duration-500 ${newReviewIds.has(review.id) ? 'bg-emerald-50/60' : ''}`}
                        >
                          {newReviewIds.has(review.id) && (
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 mb-2">
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                              </span>
                              New review
                            </div>
                          )}

                          <div className="flex items-start gap-3">
                            <ReviewerAvatar name={review.reviewer_name} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-sm text-gray-900">{review.reviewer_name}</span>
                                    {review.sentiment && <SentimentBadge sentiment={review.sentiment} />}
                                    {review.reply_status === 'replied' ? (
                                      <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                                        <CheckCircle2 className="h-3 w-3" /> Replied
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                                        <Clock className="h-3 w-3" /> Pending
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <StarDisplay rating={review.rating} />
                                    <span className="text-xs text-gray-400">
                                      {formatDistanceToNow(new Date(review.review_date), { addSuffix: true })}
                                    </span>
                                  </div>
                                </div>
                                {review.reply_status === 'pending' ? (
                                  <Button size="sm" onClick={() => openReplyDialog(review)} className="flex-shrink-0 h-8 text-xs">
                                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />Reply
                                  </Button>
                                ) : (
                                  <Button size="sm" variant="ghost" onClick={() => openReplyDialog(review)} className="flex-shrink-0 h-8 text-xs text-gray-500 hover:text-gray-700">
                                    Edit Reply
                                  </Button>
                                )}
                              </div>

                              {review.review_text ? (
                                <p className="text-sm text-gray-700 mt-2 leading-relaxed">{review.review_text}</p>
                              ) : (
                                <p className="text-xs text-gray-400 mt-2 italic">No written review</p>
                              )}

                              {review.reply_text && (
                                <div className="mt-2">
                                  <button
                                    onClick={() => toggleReply(review.id)}
                                    className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
                                  >
                                    <MessageSquare className="h-3.5 w-3.5" />
                                    Your reply
                                    {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                  </button>
                                  {expanded && (
                                    <div className="mt-1.5 bg-blue-50 border-l-4 border-blue-400 px-3 py-2 rounded-r-lg">
                                      <p className="text-xs text-gray-700 leading-relaxed">{review.reply_text}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <Dialog open={!!selectedReview} onOpenChange={open => !open && setSelectedReview(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {selectedReview?.reply_status === 'replied' ? 'Edit Reply' : 'Reply to Review'}
            </DialogTitle>
            <DialogDescription>
              Responding to {selectedReview?.reviewer_name}&apos;s review
            </DialogDescription>
          </DialogHeader>

          {selectedReview && (
            <div className="space-y-4">
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <ReviewerAvatar name={selectedReview.reviewer_name} />
                  <div>
                    <p className="font-semibold text-sm">{selectedReview.reviewer_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StarDisplay rating={selectedReview.rating} />
                      <span className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(selectedReview.review_date), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
                {selectedReview.review_text ? (
                  <p className="text-sm text-gray-700 leading-relaxed">{selectedReview.review_text}</p>
                ) : (
                  <p className="text-xs text-gray-400 italic">No written review</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-700">Your Reply</label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGenerateAIReply(selectedReview)}
                    disabled={loadingAI}
                    className="h-7 text-xs"
                  >
                    {loadingAI
                      ? <><Loader2 className="mr-1.5 h-3 w-3 animate-spin" />Generating...</>
                      : <><Sparkles className="mr-1.5 h-3 w-3" />AI Suggest</>
                    }
                  </Button>
                </div>
                <Textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Write your reply here..."
                  rows={5}
                  className="resize-none text-sm"
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400">Be professional and empathetic.</p>
                  <span className={`text-xs ${replyText.length > 4000 ? 'text-red-500' : 'text-gray-400'}`}>
                    {replyText.length}/4000
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedReview(null)}>Cancel</Button>
            <Button
              onClick={handleSubmitReply}
              disabled={submitting || !replyText.trim() || replyText.length > 4000}
            >
              {submitting
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                : <><Send className="mr-2 h-4 w-4" />Save Reply</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
