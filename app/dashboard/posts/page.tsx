"use client";

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Sparkles, Plus, Calendar, Eye, Trash2, FileText,
  Loader2, Megaphone, Tag, Clock, CheckCircle2,
  AlertCircle, RefreshCw, Send, ImageIcon, X, WandSparkles,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api-client';
import { formatDistanceToNow, format } from 'date-fns';

interface Post {
  id: string;
  business_id: string;
  title: string | null;
  content: string;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  post_type: string | null;
  published_at: string | null;
  scheduled_for: string | null;
  ai_generated: boolean;
  google_post_id: string | null;
  image_url: string | null;
  created_at: string;
}

interface Business {
  id: string;
  name: string;
}

const POST_TYPES = [
  { value: 'STANDARD', label: 'Update', icon: Megaphone, description: 'Share news or an announcement' },
  { value: 'OFFER', label: 'Offer', icon: Tag, description: 'Promote a discount or deal' },
  { value: 'EVENT', label: 'Event', icon: Calendar, description: 'Announce an upcoming event' },
];

const STATUS_CONFIG = {
  published: { label: 'Published', color: 'bg-green-100 text-green-700 border-green-200' },
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-600 border-gray-200' },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700 border-red-200' },
};

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState('');
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Composer state
  const [postType, setPostType] = useState('STANDARD');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  // Image state
  const [imageUrl, setImageUrl] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');
  const [generatingImage, setGeneratingImage] = useState(false);
  const [showImageSection, setShowImageSection] = useState(false);

  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      const [postsData, bizData] = await Promise.all([
        api.get<{ posts: Post[] }>('/api/posts'),
        api.get<{ businesses: Business[] }>('/api/gmb/check-status'),
      ]);
      setPosts(postsData.posts ?? []);
      const bizList: Business[] = bizData.businesses ?? [];
      setBusinesses(bizList);
      if (bizList.length > 0 && !selectedBusinessId) {
        setSelectedBusinessId(bizList[0].id);
      }
    } catch (err: any) {
      toast({ title: 'Failed to load posts', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [selectedBusinessId, toast]);

  useEffect(() => { fetchData(); }, []);

  const resetComposer = () => {
    setEditingPost(null);
    setTitle('');
    setContent('');
    setAiPrompt('');
    setPostType('STANDARD');
    setImageUrl('');
    setImagePrompt('');
    setShowImageSection(false);
  };

  const openComposer = (post?: Post) => {
    if (post) {
      setEditingPost(post);
      setTitle(post.title ?? '');
      setContent(post.content);
      setPostType(post.post_type ?? 'STANDARD');
      setImageUrl(post.image_url ?? '');
      setShowImageSection(!!post.image_url);
      setImagePrompt('');
      setAiPrompt('');
    } else {
      resetComposer();
    }
    setSheetOpen(true);
  };

  const handleGenerateAI = async () => {
    if (!selectedBusinessId) {
      toast({ title: 'Select a business first', variant: 'destructive' });
      return;
    }
    setGeneratingAI(true);
    try {
      const data = await api.post<{ title: string; content: string }>('/api/ai/generate-post', {
        businessId: selectedBusinessId,
        postType,
        prompt: aiPrompt,
      });
      setTitle(data.title ?? '');
      setContent(data.content ?? '');
      toast({ title: 'AI content ready', description: 'Review and edit before publishing.' });
    } catch (err: any) {
      toast({ title: 'AI generation failed', description: err.message, variant: 'destructive' });
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!selectedBusinessId) {
      toast({ title: 'Select a business first', variant: 'destructive' });
      return;
    }
    setGeneratingImage(true);
    try {
      const biz = businesses.find(b => b.id === selectedBusinessId);
      const data = await api.post<{ imageUrl: string }>('/api/ai/generate-image', {
        prompt: imagePrompt || undefined,
        businessName: biz?.name,
        postType,
      });
      setImageUrl(data.imageUrl);
      toast({ title: 'Image generated!', description: 'Looks great. You can regenerate if needed.' });
    } catch (err: any) {
      toast({ title: 'Image generation failed', description: err.message, variant: 'destructive' });
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!content.trim()) {
      toast({ title: 'Content is required', variant: 'destructive' });
      return;
    }
    setSavingDraft(true);
    try {
      await api.post('/api/posts', {
        businessId: selectedBusinessId,
        title: title || null,
        content,
        postType,
        aiGenerated: !!aiPrompt,
        aiPrompt: aiPrompt || null,
        imageUrl: imageUrl || null,
      });
      toast({ title: 'Draft saved' });
      setSheetOpen(false);
      resetComposer();
      await fetchData();
    } catch (err: any) {
      toast({ title: 'Failed to save draft', description: err.message, variant: 'destructive' });
    } finally {
      setSavingDraft(false);
    }
  };

  const handlePublish = async () => {
    if (!content.trim()) {
      toast({ title: 'Content is required', variant: 'destructive' });
      return;
    }
    setPublishing(true);
    try {
      await api.post('/api/gmb/publish-post', {
        postId: editingPost?.id ?? null,
        businessId: selectedBusinessId,
        title: title || null,
        content,
        postType,
        aiGenerated: !!aiPrompt,
        aiPrompt: aiPrompt || null,
        imageUrl: imageUrl || null,
      });
      toast({ title: 'Published to Google!', description: 'Your post is now live on Google Business Profile.' });
      setSheetOpen(false);
      resetComposer();
      await fetchData();
    } catch (err: any) {
      toast({ title: 'Publish failed', description: err.message, variant: 'destructive' });
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/posts?id=${id}`);
      setPosts(prev => prev.filter(p => p.id !== id));
      toast({ title: 'Post deleted' });
    } catch (err: any) {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
    } finally {
      setDeleteId(null);
    }
  };

  const publishedPosts = posts.filter(p => p.status === 'published');
  const draftPosts = posts.filter(p => p.status === 'draft' || p.status === 'scheduled');
  const charCount = content.length;
  const charLimit = 1500;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1100px] mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Posts</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Publish updates, offers, and events to your Google Business Profile
            </p>
          </div>
          <Button onClick={() => openComposer()}>
            <Plus className="mr-2 h-4 w-4" />
            Create Post
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Published</p>
            <p className="text-3xl font-bold text-gray-900">{publishedPosts.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Drafts</p>
            <p className="text-3xl font-bold text-gray-900">{draftPosts.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Last Post</p>
            <p className="text-sm font-semibold text-gray-900">
              {publishedPosts[0]?.published_at
                ? formatDistanceToNow(new Date(publishedPosts[0].published_at), { addSuffix: true })
                : 'Never'}
            </p>
          </div>
        </div>

        {/* Drafts */}
        {draftPosts.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-gray-700 mb-3">Drafts & Scheduled</h2>
            <div className="space-y-3">
              {draftPosts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  onEdit={() => openComposer(post)}
                  onDelete={() => setDeleteId(post.id)}
                  onPublish={async () => {
                    setEditingPost(post);
                    setPublishing(true);
                    try {
                      await api.post('/api/gmb/publish-post', {
                        postId: post.id,
                        businessId: post.business_id,
                        title: post.title,
                        content: post.content,
                        postType: post.post_type ?? 'STANDARD',
                        imageUrl: post.image_url || null,
                      });
                      toast({ title: 'Published to Google!', description: 'Your post is now live.' });
                      await fetchData();
                    } catch (err: any) {
                      toast({ title: 'Publish failed', description: err.message, variant: 'destructive' });
                    } finally {
                      setPublishing(false);
                      setEditingPost(null);
                    }
                  }}
                  publishing={publishing && editingPost?.id === post.id}
                />
              ))}
            </div>
          </div>
        )}

        {/* Published */}
        <div>
          <h2 className="text-sm font-bold text-gray-700 mb-3">
            Published {publishedPosts.length > 0 && <span className="text-gray-400 font-normal">({publishedPosts.length})</span>}
          </h2>
          {publishedPosts.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-200 rounded-xl p-12 text-center">
              <FileText className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p className="font-medium text-gray-500">No posts yet</p>
              <p className="text-sm text-gray-400 mt-1 mb-4">
                Businesses that post weekly get 2x more profile views
              </p>
              <Button size="sm" onClick={() => openComposer()}>
                <Sparkles className="mr-2 h-4 w-4" />
                Create your first post
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {publishedPosts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  onEdit={() => openComposer(post)}
                  onDelete={() => setDeleteId(post.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Composer Sheet */}
      <Sheet open={sheetOpen} onOpenChange={open => { setSheetOpen(open); if (!open) resetComposer(); }}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>{editingPost ? 'Edit Post' : 'Create Post'}</SheetTitle>
            <SheetDescription>
              {editingPost ? 'Update your post content' : 'Write and publish to Google Business Profile'}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5">
            {/* Post type selector */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Post Type</p>
              <div className="grid grid-cols-3 gap-2">
                {POST_TYPES.map(type => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.value}
                      onClick={() => setPostType(type.value)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all ${
                        postType === type.value
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {type.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* AI text generation */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <p className="text-sm font-semibold text-purple-800">Generate Text with AI</p>
              </div>
              <Input
                placeholder="e.g. weekend discount on all services, 20% off"
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                className="text-sm bg-white"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleGenerateAI}
                disabled={generatingAI}
                className="w-full border-purple-200 text-purple-700 hover:bg-purple-50"
              >
                {generatingAI
                  ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Generating...</>
                  : <><Sparkles className="mr-2 h-3.5 w-3.5" />Generate Content</>}
              </Button>
            </div>

            {/* Title */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 block">
                Title <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <Input
                placeholder="e.g. Weekend Special Offer"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>

            {/* Content */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Post Content *</label>
              <Textarea
                placeholder="Write your post here, or use AI to generate content above..."
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={6}
                className="resize-none text-sm"
              />
              <div className="flex justify-between mt-1">
                <p className="text-xs text-gray-400">
                  Include a call-to-action for best results
                </p>
                <span className={`text-xs ${charCount > charLimit ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                  {charCount}/{charLimit}
                </span>
              </div>
            </div>

            {/* Image section */}
            {!showImageSection ? (
              <button
                onClick={() => setShowImageSection(true)}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50 transition-all"
              >
                <ImageIcon className="h-4 w-4" />
                Add an AI-generated image
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <WandSparkles className="h-4 w-4 text-blue-600" />
                    <p className="text-sm font-semibold text-gray-700">AI Image</p>
                  </div>
                  {!imageUrl && (
                    <button
                      onClick={() => { setShowImageSection(false); setImageUrl(''); setImagePrompt(''); }}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {/* Generated image preview */}
                {imageUrl ? (
                  <div className="relative rounded-xl overflow-hidden bg-gray-100 aspect-square">
                    <Image
                      src={imageUrl}
                      alt="Generated post image"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors group flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={handleGenerateImage}
                        disabled={generatingImage}
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-gray-800 text-xs font-semibold px-3 py-1.5 rounded-lg shadow flex items-center gap-1.5 hover:bg-gray-50"
                      >
                        {generatingImage
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <RefreshCw className="h-3.5 w-3.5" />}
                        Regenerate
                      </button>
                      <button
                        onClick={() => { setImageUrl(''); setShowImageSection(false); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-red-500 text-xs font-semibold px-3 py-1.5 rounded-lg shadow flex items-center gap-1.5 hover:bg-red-50"
                      >
                        <X className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </div>
                    {/* Always-visible action bar at the bottom */}
                    <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/60 to-transparent flex gap-2">
                      <button
                        onClick={handleGenerateImage}
                        disabled={generatingImage}
                        className="flex-1 bg-white/90 hover:bg-white text-gray-800 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                      >
                        {generatingImage
                          ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Generating...</>
                          : <><RefreshCw className="h-3.5 w-3.5" />Regenerate</>}
                      </button>
                      <button
                        onClick={() => { setImageUrl(''); }}
                        className="bg-white/90 hover:bg-white text-red-500 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-5 space-y-3">
                    <div className="flex items-center justify-center">
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                        <WandSparkles className="h-7 w-7 text-blue-500" />
                      </div>
                    </div>
                    <Input
                      placeholder="Describe the image (optional — leave blank for auto)"
                      value={imagePrompt}
                      onChange={e => setImagePrompt(e.target.value)}
                      className="text-sm bg-white"
                    />
                    <Button
                      size="sm"
                      onClick={handleGenerateImage}
                      disabled={generatingImage}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                    >
                      {generatingImage
                        ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Generating image...</>
                        : <><WandSparkles className="mr-2 h-3.5 w-3.5" />Generate with Gemini AI</>}
                    </Button>
                    <p className="text-center text-xs text-gray-400">
                      Photorealistic marketing image, 1:1 square format
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                disabled={savingDraft || !content.trim()}
                className="flex-1"
              >
                {savingDraft ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Draft
              </Button>
              <Button
                onClick={handlePublish}
                disabled={publishing || !content.trim() || charCount > charLimit}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {publishing
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Publishing...</>
                  : <><Send className="mr-2 h-4 w-4" />Publish to Google</>}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the post from your dashboard. It will not be deleted from Google if already published.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PostCard({
  post, onEdit, onDelete, onPublish, publishing,
}: {
  post: Post;
  onEdit: () => void;
  onDelete: () => void;
  onPublish?: () => void;
  publishing?: boolean;
}) {
  const config = STATUS_CONFIG[post.status] ?? STATUS_CONFIG.draft;
  const TypeIcon = POST_TYPES.find(t => t.value === post.post_type)?.icon ?? FileText;

  return (
    <Card className="bg-white border-gray-200 hover:border-gray-300 transition-colors overflow-hidden">
      <CardContent className="pt-0 pb-0">
        <div className="flex items-stretch gap-0">
          {/* Image thumbnail */}
          {post.image_url && (
            <div className="relative w-24 flex-shrink-0 bg-gray-100">
              <Image
                src={post.image_url}
                alt="Post image"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          )}

          {/* Content */}
          <div className="flex items-start justify-between gap-3 flex-1 min-w-0 p-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <TypeIcon className="h-4 w-4 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {post.title && (
                    <span className="text-sm font-semibold text-gray-900 truncate">{post.title}</span>
                  )}
                  <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border ${config.color}`}>
                    {config.label}
                  </span>
                  {post.ai_generated && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-purple-600 font-medium">
                      <Sparkles className="h-3 w-3" />AI
                    </span>
                  )}
                  {post.image_url && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-blue-500 font-medium">
                      <ImageIcon className="h-3 w-3" />Photo
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">{post.content}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  {post.status === 'published' && post.published_at && (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      {format(new Date(post.published_at), 'MMM d, yyyy')}
                    </span>
                  )}
                  {post.status === 'scheduled' && post.scheduled_for && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-blue-500" />
                      Scheduled {format(new Date(post.scheduled_for), 'MMM d, yyyy')}
                    </span>
                  )}
                  {post.status === 'draft' && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Created {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    </span>
                  )}
                  {post.google_post_id && (
                    <span className="flex items-center gap-1 text-green-600">
                      <Eye className="h-3 w-3" />
                      Live on Google
                    </span>
                  )}
                  {post.status === 'failed' && (
                    <span className="flex items-center gap-1 text-red-500">
                      <AlertCircle className="h-3 w-3" />
                      Failed to publish
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {(post.status === 'draft' || post.status === 'failed') && onPublish && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onPublish}
                  disabled={publishing}
                  className="h-7 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  {publishing
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <><Send className="h-3 w-3 mr-1" />Publish</>}
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={onEdit} className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700">
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onDelete}
                className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
