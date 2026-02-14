"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Sparkles, Plus, Calendar, Eye, Heart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function PostsPage() {
  const [showDialog, setShowDialog] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const { toast } = useToast();

  const mockPosts = [
    {
      id: '1',
      title: 'Summer Sale Announcement',
      content: 'Get 20% off all services this summer! Book now and save big.',
      status: 'published',
      published_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      views: 1234,
      likes: 89,
    },
    {
      id: '2',
      title: 'New Services Available',
      content: 'We\'re excited to announce new services available starting next week!',
      status: 'scheduled',
      scheduled_for: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      views: 0,
      likes: 0,
    },
    {
      id: '3',
      title: 'Customer Appreciation Day',
      content: 'Thank you to all our amazing customers! Special offers coming soon.',
      status: 'draft',
      views: 0,
      likes: 0,
    },
  ];

  const handleGenerateAI = async () => {
    setLoadingAI(true);
    setTimeout(() => {
      setTitle('Special Weekend Offer');
      setContent(
        'This weekend only! Enjoy exclusive discounts on our premium services. Book your appointment now and experience the difference. Limited slots available - first come, first served!'
      );
      setLoadingAI(false);
      toast({
        title: 'AI Content Generated',
        description: 'Your post content has been generated successfully',
      });
    }, 2000);
  };

  const handlePublish = () => {
    toast({
      title: 'Post Published',
      description: 'Your post has been published successfully',
    });
    setShowDialog(false);
    setTitle('');
    setContent('');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Posts</h1>
          <p className="text-gray-500 mt-1">Create and manage your Google Business posts</p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Post
        </Button>
      </div>

      <div className="grid gap-4">
        {mockPosts.map((post) => (
          <Card key={post.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold">{post.title}</h3>
                    <Badge
                      variant={
                        post.status === 'published'
                          ? 'default'
                          : post.status === 'scheduled'
                          ? 'secondary'
                          : 'outline'
                      }
                    >
                      {post.status}
                    </Badge>
                  </div>
                  <p className="text-gray-600 mb-3">{post.content}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    {post.status === 'published' && (
                      <>
                        <div className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          {post.views} views
                        </div>
                        <div className="flex items-center gap-1">
                          <Heart className="h-4 w-4" />
                          {post.likes} likes
                        </div>
                      </>
                    )}
                    {post.status === 'scheduled' && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Scheduled for {new Date(post.scheduled_for!).toLocaleDateString()}
                      </div>
                    )}
                    {post.status === 'draft' && (
                      <span>Not published yet</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                  {post.status === 'draft' && (
                    <Button size="sm">Publish</Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Post</DialogTitle>
            <DialogDescription>
              Share updates, offers, and news with your customers
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateAI}
                disabled={loadingAI}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {loadingAI ? 'Generating...' : 'Generate with AI'}
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Post Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter post title..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Post Content</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your post content..."
                rows={8}
                className="resize-none"
              />
              <p className="text-xs text-gray-500">
                Tip: Keep it concise and engaging. Posts with clear calls-to-action perform better.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Save as Draft
            </Button>
            <Button onClick={handlePublish} disabled={!title || !content}>
              Publish Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
