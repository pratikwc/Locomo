"use client";

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, HelpCircle, ThumbsUp, CheckCircle2, Clock, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api-client';
import { formatDistanceToNowStrict } from 'date-fns';

interface QAItem {
  id: string;
  question_text: string;
  question_author: string;
  upvote_count: number;
  answer_status: 'pending' | 'draft' | 'posted' | 'ignored';
  ai_answer: string | null;
  final_answer: string | null;
  asked_at: string;
  answered_at: string | null;
}

const STATUS_CONFIG = {
  pending: { label: 'Needs Answer', color: 'bg-red-100 text-red-700' },
  draft: { label: 'AI Draft Ready', color: 'bg-blue-100 text-blue-700' },
  posted: { label: 'Answered', color: 'bg-green-100 text-green-700' },
  ignored: { label: 'Ignored', color: 'bg-gray-100 text-gray-500' },
};

function QACard({
  item,
  onPost,
  onIgnore,
}: {
  item: QAItem;
  onPost: (id: string, text: string) => Promise<void>;
  onIgnore: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(item.answer_status === 'draft' || item.answer_status === 'pending');
  const [answer, setAnswer] = useState(item.ai_answer || item.final_answer || '');
  const [posting, setPosting] = useState(false);
  const cfg = STATUS_CONFIG[item.answer_status];

  const handlePost = async () => {
    if (!answer.trim()) return;
    setPosting(true);
    try {
      await onPost(item.id, answer);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>
              {cfg.label}
            </span>
            {item.upvote_count > 0 && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <ThumbsUp className="h-3 w-3" /> {item.upvote_count}
              </span>
            )}
            <span className="text-xs text-gray-400">
              Asked {formatDistanceToNowStrict(new Date(item.asked_at), { addSuffix: true })} by {item.question_author}
            </span>
          </div>
          <p className="text-sm font-semibold text-gray-900">{item.question_text}</p>
        </div>
        <button onClick={() => setExpanded(e => !e)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {expanded && item.answer_status !== 'posted' && item.answer_status !== 'ignored' && (
        <div className="space-y-2 pt-1 border-t border-gray-100">
          {item.ai_answer && (
            <p className="text-xs text-blue-600 font-medium">AI suggested answer:</p>
          )}
          <Textarea
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            rows={3}
            placeholder="Write your answer..."
            className="text-sm resize-none"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handlePost} disabled={posting || !answer.trim()}>
              {posting ? <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1.5 h-3.5 w-3.5" />}
              Post to Google
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onIgnore(item.id)} className="text-gray-400">
              Ignore
            </Button>
          </div>
        </div>
      )}

      {item.answer_status === 'posted' && item.final_answer && (
        <div className="pt-1 border-t border-gray-100">
          <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-500" /> Your answer
          </p>
          <p className="text-sm text-gray-700">{item.final_answer}</p>
        </div>
      )}
    </div>
  );
}

export default function QAPage() {
  const { toast } = useToast();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [items, setItems] = useState<QAItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'draft' | 'posted'>('all');

  const fetchBusinessId = useCallback(async () => {
    const data = await api.get<any>('/api/gmb/check-status');
    return data.businesses?.[0]?.id ?? null;
  }, []);

  const fetchItems = useCallback(async (bid: string) => {
    const data = await api.get<{ items: QAItem[] }>(`/api/qa?businessId=${bid}`);
    setItems(data.items ?? []);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const bid = await fetchBusinessId();
        setBusinessId(bid);
        if (bid) await fetchItems(bid);
      } catch { /* no-op */ }
      finally { setLoading(false); }
    })();
  }, []);

  const handleSync = async () => {
    if (!businessId) return;
    setSyncing(true);
    try {
      const data = await api.post<{ synced: number; drafted: number }>('/api/gmb/sync-qa', { businessId });
      toast({ title: 'Q&A Synced', description: `${data.synced} questions synced, ${data.drafted} AI drafts created` });
      await fetchItems(businessId);
    } catch (err: any) {
      toast({ title: 'Sync failed', description: err.message, variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  const handlePost = async (qaItemId: string, answerText: string) => {
    await api.post('/api/gmb/post-answer', { qaItemId, answerText });
    toast({ title: 'Answer posted to Google' });
    setItems(prev => prev.map(i => i.id === qaItemId
      ? { ...i, answer_status: 'posted', final_answer: answerText }
      : i
    ));
  };

  const handleIgnore = async (qaItemId: string) => {
    await api.patch(`/api/qa/${qaItemId}`, { answer_status: 'ignored' });
    setItems(prev => prev.map(i => i.id === qaItemId ? { ...i, answer_status: 'ignored' } : i));
  };

  const filtered = filter === 'all' ? items.filter(i => i.answer_status !== 'ignored') : items.filter(i => i.answer_status === filter);
  const pendingCount = items.filter(i => i.answer_status === 'pending' || i.answer_status === 'draft').length;

  if (loading) {
    return <div className="p-6 flex items-center justify-center"><RefreshCw className="h-8 w-8 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[900px] mx-auto px-4 py-6 space-y-6">

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Q&amp;A</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage customer questions on your Google Business Profile</p>
          </div>
          <Button onClick={handleSync} disabled={syncing} variant="outline" size="sm">
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Q&A'}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Questions', value: items.length, icon: HelpCircle },
            { label: 'Needs Answer', value: pendingCount, icon: Clock },
            { label: 'Answered', value: items.filter(i => i.answer_status === 'posted').length, icon: CheckCircle2 },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label} className="bg-white border-gray-200">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xl font-bold text-gray-900">{value}</p>
                    <p className="text-xs text-gray-500">{label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {(['all', 'draft', 'pending', 'posted'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === f ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {f === 'all' ? 'All' : STATUS_CONFIG[f].label}
              {f !== 'all' && (
                <span className="ml-1.5 opacity-60">{items.filter(i => i.answer_status === f).length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Q&A list */}
        {filtered.length === 0 ? (
          <Card className="bg-white border-gray-200">
            <CardContent className="py-12 text-center">
              <HelpCircle className="h-10 w-10 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">
                {items.length === 0
                  ? 'No questions yet. Click "Sync Q&A" to load questions from Google.'
                  : 'No questions in this category.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(item => (
              <QACard key={item.id} item={item} onPost={handlePost} onIgnore={handleIgnore} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
