"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Zap, Calendar, FileText, Mic2, Tag, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api-client';
import { formatDistanceToNowStrict } from 'date-fns';

interface AutopilotConfig {
  id?: string;
  business_id: string;
  enabled: boolean;
  posts_per_week: number;
  preferred_days: string[];
  post_types: string[];
  tone: string;
  topics: string[];
  last_auto_post_at: string | null;
}

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const POST_TYPES = [
  { value: 'STANDARD', label: 'Update', description: 'General business news or announcement' },
  { value: 'OFFER', label: 'Offer', description: 'Promotion or discount for customers' },
  { value: 'EVENT', label: 'Event', description: 'Upcoming event or special occasion' },
];
const TONES = [
  { value: 'friendly', label: 'Friendly', description: 'Warm and conversational' },
  { value: 'professional', label: 'Professional', description: 'Polished and formal' },
  { value: 'enthusiastic', label: 'Enthusiastic', description: 'Energetic and exciting' },
];

function ToggleChip({
  label, selected, onClick,
}: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
        selected
          ? 'border-[#6931FF] bg-[#f0ebff] text-[#6931FF]'
          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
      }`}
    >
      {label}
    </button>
  );
}

export default function AutopilotPage() {
  const { toast } = useToast();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [config, setConfig] = useState<AutopilotConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [topicInput, setTopicInput] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const status = await api.get<any>('/api/gmb/check-status');
        const biz = status.businesses?.[0];
        if (!biz) { setLoading(false); return; }
        setBusinessId(biz.id);
        const data = await api.get<{ config: AutopilotConfig }>(`/api/scheduler?businessId=${biz.id}`);
        setConfig(data.config);
        setTopicInput(data.config.topics.join(', '));
      } catch { /* no-op */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const save = async (updates: Partial<AutopilotConfig>) => {
    if (!businessId || !config) return;
    const next = { ...config, ...updates };
    setConfig(next);
    setSaving(true);
    try {
      const data = await api.patch<{ config: AutopilotConfig }>('/api/scheduler', { businessId, ...updates });
      setConfig(data.config);
      toast({ title: 'Autopilot settings saved' });
    } catch (err: any) {
      setConfig(config);
      toast({ title: 'Failed to save', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day: string) => {
    if (!config) return;
    const days = config.preferred_days.includes(day)
      ? config.preferred_days.filter(d => d !== day)
      : [...config.preferred_days, day];
    if (days.length === 0) return; // must have at least one day
    save({ preferred_days: days });
  };

  const togglePostType = (type: string) => {
    if (!config) return;
    const types = config.post_types.includes(type)
      ? config.post_types.filter(t => t !== type)
      : [...config.post_types, type];
    if (types.length === 0) return;
    save({ post_types: types });
  };

  const addTopic = () => {
    if (!config || !topicInput.trim()) return;
    const topics = topicInput.split(',').map(t => t.trim()).filter(Boolean);
    save({ topics });
    setTopicInput(topics.join(', '));
  };

  const removeTopic = (topic: string) => {
    if (!config) return;
    save({ topics: config.topics.filter(t => t !== topic) });
    setTopicInput(config.topics.filter(t => t !== topic).join(', '));
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-6">
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
          <Zap className="h-10 w-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Connect your Google Business Profile to use Autopilot.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[800px] mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Autopilot</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Configure automatic weekly posting to your Google Business Profile
            </p>
          </div>
          {saving && <Loader2 className="h-5 w-5 animate-spin text-gray-400 mt-1" />}
        </div>

        {/* Enable / Last run */}
        <Card className="bg-white border-gray-200">
          <CardContent className="py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${config.enabled ? 'bg-green-50' : 'bg-gray-50'}`}>
                  <Zap className={`h-5 w-5 ${config.enabled ? 'text-green-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {config.enabled ? 'Autopilot is ON' : 'Autopilot is OFF'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {config.last_auto_post_at
                      ? `Last post ${formatDistanceToNowStrict(new Date(config.last_auto_post_at), { addSuffix: true })}`
                      : 'No posts published yet'}
                  </p>
                </div>
              </div>
              <Switch
                checked={config.enabled}
                onCheckedChange={checked => save({ enabled: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Posting schedule */}
        <Card className="bg-white border-gray-200">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <CardTitle className="text-base">Posting Schedule</CardTitle>
            </div>
            <CardDescription>Which days autopilot should publish posts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label className="text-sm font-medium mb-2 block">Posts per week</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => save({ posts_per_week: n })}
                    className={`w-10 h-10 rounded-lg text-sm font-semibold border transition-all ${
                      config.posts_per_week === n
                        ? 'border-[#6931FF] bg-[#f0ebff] text-[#6931FF]'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">Preferred posting days</Label>
              <div className="flex flex-wrap gap-2">
                {ALL_DAYS.map(day => (
                  <ToggleChip
                    key={day}
                    label={day.slice(0, 3)}
                    selected={config.preferred_days.includes(day)}
                    onClick={() => toggleDay(day)}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Autopilot will publish on these days up to the weekly limit.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Post types */}
        <Card className="bg-white border-gray-200">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-400" />
              <CardTitle className="text-base">Post Types</CardTitle>
            </div>
            <CardDescription>Autopilot rotates through selected post types</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-3">
              {POST_TYPES.map(pt => (
                <button
                  key={pt.value}
                  type="button"
                  onClick={() => togglePostType(pt.value)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    config.post_types.includes(pt.value)
                      ? 'border-[#6931FF] bg-[#f0ebff]'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <p className={`text-sm font-semibold ${config.post_types.includes(pt.value) ? 'text-[#6931FF]' : 'text-gray-800'}`}>
                    {pt.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{pt.description}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tone */}
        <Card className="bg-white border-gray-200">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Mic2 className="h-4 w-4 text-gray-400" />
              <CardTitle className="text-base">Tone of Voice</CardTitle>
            </div>
            <CardDescription>How autopilot-generated posts should sound</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-3">
              {TONES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => save({ tone: t.value })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    config.tone === t.value
                      ? 'border-[#6931FF] bg-[#f0ebff]'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <p className={`text-sm font-semibold ${config.tone === t.value ? 'text-[#6931FF]' : 'text-gray-800'}`}>
                    {t.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Topics */}
        <Card className="bg-white border-gray-200">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-gray-400" />
              <CardTitle className="text-base">Focus Topics</CardTitle>
            </div>
            <CardDescription>Optional topics for autopilot posts (e.g. "seasonal menu, outdoor seating")</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={topicInput}
                onChange={e => setTopicInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTopic(); } }}
                placeholder="e.g. seasonal specials, loyalty program"
                className="text-sm"
              />
              <Button type="button" size="sm" variant="outline" onClick={addTopic}>
                Save
              </Button>
            </div>
            {config.topics.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {config.topics.map(topic => (
                  <Badge
                    key={topic}
                    variant="secondary"
                    className="text-xs cursor-pointer hover:bg-red-50 hover:text-red-600 transition-colors"
                    onClick={() => removeTopic(topic)}
                  >
                    {topic} ×
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-400">Separate topics with commas. Click a topic to remove it.</p>
          </CardContent>
        </Card>

        {/* How it works */}
        <Card className="bg-gray-50 border-gray-200">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <CardTitle className="text-base text-gray-600">How Autopilot Works</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-xs text-gray-500">
              <li className="flex items-start gap-2">
                <span className="text-[#6931FF] font-bold mt-0.5">1.</span>
                A cron job runs daily and checks if today is a preferred posting day.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#6931FF] font-bold mt-0.5">2.</span>
                If the weekly post limit hasn't been reached, it generates a post using your business category and focus topics.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#6931FF] font-bold mt-0.5">3.</span>
                The post is published directly to your Google Business Profile with local SEO keywords woven in.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#6931FF] font-bold mt-0.5">4.</span>
                You can see all autopilot posts in the Posts page and your Weekly Digest.
              </li>
            </ul>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
