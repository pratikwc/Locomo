"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Loader as Loader2, Star } from 'lucide-react';

interface BusinessSettings {
  id: string;
  name: string;
  auto_reply_enabled: boolean;
  auto_reply_min_rating: number;
}

const RATING_OPTIONS = [
  { value: 5, label: '5★ only', description: 'Only reply to 5-star reviews' },
  { value: 4, label: '4★ and above', description: 'Reply to 4 and 5-star reviews' },
  { value: 3, label: '3★ and above', description: 'Reply to all except 1-2 star' },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [business, setBusiness] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchBusiness = async () => {
      try {
        const data = await api.get<{ businesses: BusinessSettings[] }>('/api/gmb/check-status');
        if (data.businesses?.[0]) setBusiness(data.businesses[0]);
      } catch {
        // no business yet, fine
      } finally {
        setLoading(false);
      }
    };
    fetchBusiness();
  }, []);

  const saveAutoReplySettings = async (updates: Partial<BusinessSettings>) => {
    if (!business) return;
    const updated = { ...business, ...updates };
    setBusiness(updated);
    setSaving(true);
    try {
      await api.patch(`/api/businesses/${business.id}`, {
        auto_reply_enabled: updated.auto_reply_enabled,
        auto_reply_min_rating: updated.auto_reply_min_rating,
      });
      toast({ title: 'Settings saved' });
    } catch (err: any) {
      // Rollback
      setBusiness(business);
      toast({ title: 'Failed to save', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1 text-sm">Manage your account preferences</p>
      </div>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SettingRow label="Phone Number" value={user?.phoneNumber || 'Not set'} />
          <SettingRow label="Account Role" value={user?.role || 'user'} capitalize />
          <SettingRow label="Account Status" value={user?.status || 'active'} capitalize />
        </CardContent>
      </Card>

      {/* Auto-Reply */}
      <Card>
        <CardHeader>
          <CardTitle>Auto-Reply to Reviews</CardTitle>
          <CardDescription>
            Automatically generate and post AI replies to new Google reviews
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" />Loading settings...
            </div>
          ) : !business ? (
            <p className="text-sm text-gray-500">Connect your Google Business Profile to use auto-reply.</p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-reply" className="text-sm font-medium">Enable Auto-Reply</Label>
                  <p className="text-xs text-gray-500 mt-0.5">
                    AI will reply to qualifying reviews automatically during sync
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />}
                  <Switch
                    id="auto-reply"
                    checked={business.auto_reply_enabled}
                    onCheckedChange={checked => saveAutoReplySettings({ auto_reply_enabled: checked })}
                  />
                </div>
              </div>

              {business.auto_reply_enabled && (
                <div className="space-y-2 pt-1">
                  <Label className="text-sm font-medium">Minimum Rating to Auto-Reply</Label>
                  <p className="text-xs text-gray-500">
                    Reviews below this rating will be queued for manual reply — never auto-replied to
                  </p>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {RATING_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => saveAutoReplySettings({ auto_reply_min_rating: opt.value })}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          business.auto_reply_min_rating === opt.value
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-1 mb-1">
                          <Star className={`h-3.5 w-3.5 ${
                            business.auto_reply_min_rating === opt.value
                              ? 'fill-blue-600 text-blue-600'
                              : 'fill-yellow-400 text-yellow-400'
                          }`} />
                          <span className={`text-xs font-bold ${
                            business.auto_reply_min_rating === opt.value ? 'text-blue-700' : 'text-gray-700'
                          }`}>{opt.label}</span>
                        </div>
                        <p className="text-[11px] text-gray-500">{opt.description}</p>
                      </button>
                    ))}
                  </div>
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
                    <span className="text-amber-500 text-sm">⚠</span>
                    <p className="text-xs text-amber-700">
                      Negative reviews (1-2★) are never auto-replied to — they always require your personal attention.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Configure how you receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="new-reviews" className="text-sm">New Reviews</Label>
            <Switch id="new-reviews" defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="ai-suggestions" className="text-sm">AI Suggestions</Label>
            <Switch id="ai-suggestions" defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="weekly-report" className="text-sm">Weekly Performance Report</Label>
            <Switch id="weekly-report" defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* Connected Accounts */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Accounts</CardTitle>
          <CardDescription>Manage your connected services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Google My Business</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {business?.name ?? 'Not connected'}
              </p>
            </div>
            <Badge variant="default" className="bg-green-600 text-xs">Connected</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" size="sm">Delete Account</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingRow({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <p className={`text-sm text-gray-500 ${capitalize ? 'capitalize' : ''}`}>{value}</p>
    </div>
  );
}
