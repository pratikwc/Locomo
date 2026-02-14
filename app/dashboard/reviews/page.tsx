"use client";

import { useState, useEffect } from 'react';
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
import { Star, Sparkles, Send, Filter, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

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

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const mockReviews: Review[] = [
        {
          id: '1',
          reviewer_name: 'Sarah Johnson',
          reviewer_photo_url: null,
          rating: 5,
          review_text: 'Absolutely fantastic service! The team went above and beyond to help me. Highly recommend!',
          review_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          reply_text: null,
          reply_status: 'pending',
          ai_suggested_reply: null,
          sentiment: 'positive',
        },
        {
          id: '2',
          reviewer_name: 'Michael Chen',
          reviewer_photo_url: null,
          rating: 4,
          review_text: 'Good experience overall. Wait time was a bit long but staff were friendly.',
          review_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          reply_text: null,
          reply_status: 'pending',
          ai_suggested_reply: null,
          sentiment: 'positive',
        },
        {
          id: '3',
          reviewer_name: 'Emily Davis',
          reviewer_photo_url: null,
          rating: 2,
          review_text: 'Not what I expected. Service was slow and the product quality could be better.',
          review_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          reply_text: null,
          reply_status: 'pending',
          ai_suggested_reply: null,
          sentiment: 'negative',
        },
        {
          id: '4',
          reviewer_name: 'Robert Wilson',
          reviewer_photo_url: null,
          rating: 5,
          review_text: 'Best in the business! Been coming here for years and never disappointed.',
          review_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          reply_text: 'Thank you so much for your continued support!',
          reply_status: 'replied',
          ai_suggested_reply: null,
          sentiment: 'positive',
        },
      ];

      setReviews(mockReviews);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch reviews',
        variant: 'destructive',
      });
    }
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

  const openReplyDialog = (review: Review) => {
    setSelectedReview(review);
    setReplyText(review.ai_suggested_reply || review.reply_text || '');
  };

  const filteredReviews = reviews.filter((review) => {
    if (filter === 'pending') return review.reply_status === 'pending';
    if (filter === 'replied') return review.reply_status === 'replied';
    return true;
  });

  const stats = {
    average: (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length || 0).toFixed(1),
    total: reviews.length,
    pending: reviews.filter((r) => r.reply_status === 'pending').length,
    responseRate: Math.round(
      (reviews.filter((r) => r.reply_status === 'replied').length / reviews.length) * 100
    ),
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reviews</h1>
          <p className="text-gray-500 mt-1">Manage and respond to customer reviews</p>
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
              <CardDescription>View and respond to customer feedback</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input placeholder="Search reviews..." className="pl-8 w-64" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">
                Pending ({stats.pending})
              </TabsTrigger>
              <TabsTrigger value="replied">Replied</TabsTrigger>
            </TabsList>

            <TabsContent value={filter} className="mt-6">
              <div className="space-y-4">
                {filteredReviews.map((review) => (
                  <div
                    key={review.id}
                    className="border rounded-lg p-4 space-y-3 hover:border-blue-200 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-semibold">
                          {review.reviewer_name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{review.reviewer_name}</p>
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

                    <p className="text-gray-700">{review.review_text}</p>

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
