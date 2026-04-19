"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  RefreshCw, User, Phone, Mail, Shield, Calendar, Link2,
  CheckCircle2, AlertCircle, AlertTriangle, ChevronRight,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { format } from 'date-fns';
import { api } from '@/lib/api-client';
import type { AuditItem, ProfileAudit } from '@/app/api/profile/audit/route';

interface Business {
  id: string;
  name: string;
  category: string | null;
  address: any;
  phone: string | null;
  website: string | null;
  description: string | null;
  hours: any;
}

const STATUS_CONFIG = {
  complete: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50', label: 'Complete' },
  needs_improvement: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50', label: 'Needs Work' },
  missing: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50', label: 'Missing' },
};

const PRIORITY_COLOR = { high: 'bg-red-100 text-red-700', medium: 'bg-amber-100 text-amber-700', low: 'bg-gray-100 text-gray-600' };

function ScoreRing({ percentage }: { percentage: number }) {
  const color = percentage >= 80 ? '#22c55e' : percentage >= 50 ? '#f59e0b' : '#ef4444';
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (percentage / 100) * circumference;
  return (
    <div className="relative w-28 h-28 flex-shrink-0">
      <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="#f3f4f6" strokeWidth="8" />
        <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-gray-900">{percentage}%</span>
        <span className="text-xs text-gray-400">complete</span>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [googleAccountInfo, setGoogleAccountInfo] = useState<any>(null);
  const [audit, setAudit] = useState<ProfileAudit | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const statusData = await api.get<any>('/api/gmb/check-status');
      if (statusData.connected) {
        setUserProfile({
          display_name: statusData.display_name,
          profile_photo_url: statusData.profile_photo_url,
          email: statusData.email,
        });
        setGoogleAccountInfo({
          email: statusData.email,
          last_synced: statusData.last_synced || new Date().toISOString(),
        });
        if (statusData.businesses?.[0]) {
          const biz = statusData.businesses[0];
          const [bizData, auditData] = await Promise.all([
            api.get<Business>(`/api/businesses/${biz.id}`),
            api.get<ProfileAudit>(`/api/profile/audit?businessId=${biz.id}`),
          ]);
          setBusiness(bizData);
          setAudit(auditData);
        }
      }
    } catch (error) {
      console.error('[Profile] Error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const data = await api.post<{ message?: string }>('/api/gmb/sync-businesses');
      toast({ title: 'Sync Complete', description: data.message });
      await fetchData();
    } catch (error: any) {
      if (error.status === 401) {
        toast({ title: 'Google session expired', description: 'Go to dashboard to reconnect.', variant: 'destructive' });
        router.push('/dashboard');
      } else {
        toast({ title: 'Sync Failed', description: error.message, variant: 'destructive' });
      }
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const formatAddress = (address: any) => {
    if (!address) return '';
    return [...(address.addressLines || []), address.locality, address.administrativeArea, address.postalCode]
      .filter(Boolean).join(', ');
  };

  if (loading) {
    return <div className="p-6 flex items-center justify-center"><RefreshCw className="h-8 w-8 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1100px] mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
            <p className="text-sm text-gray-500 mt-0.5">Your Google Business Profile health and account details</p>
          </div>
          <Button onClick={handleSync} disabled={syncing} variant="outline" size="sm">
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>

        {/* Profile Completeness Audit */}
        {audit && (
          <Card className="bg-white border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Profile Completeness</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6 mb-5">
                <ScoreRing percentage={audit.percentage} />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800 mb-1">
                    {audit.percentage >= 80 ? 'Great profile!' : audit.percentage >= 50 ? 'Good start — a few things to fix' : 'Profile needs attention'}
                  </p>
                  <p className="text-sm text-gray-500 mb-3">
                    {audit.score}/{audit.maxScore} points · {audit.items.filter(i => i.status === 'complete').length} of {audit.items.length} fields complete
                  </p>
                  {audit.topAction && (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                      <p className="text-xs font-semibold text-blue-700 mb-0.5">Top action</p>
                      <p className="text-xs text-blue-600">{audit.topAction}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {audit.items.map(item => {
                  const cfg = STATUS_CONFIG[item.status];
                  const Icon = cfg.icon;
                  return (
                    <div key={item.field} className={`flex items-start gap-3 rounded-lg p-3 ${cfg.bg}`}>
                      <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${cfg.color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-800">{item.label}</span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${PRIORITY_COLOR[item.priority]}`}>
                            {item.priority}
                          </span>
                        </div>
                        {item.status !== 'complete' && (
                          <p className="text-xs text-gray-600 mt-0.5">{item.suggestion}</p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">{item.score}/{item.maxScore} pts</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Business info */}
        {business && (
          <Card className="bg-white border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Business Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Business Name</Label>
                  <Input value={business.name || ''} readOnly className="bg-gray-50" />
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Input value={business.category || ''} readOnly className="bg-gray-50" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea value={business.description || ''} rows={3} readOnly className="bg-gray-50 resize-none" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input value={business.phone || ''} readOnly className="bg-gray-50" />
                </div>
                <div className="space-y-1.5">
                  <Label>Website</Label>
                  <Input value={business.website || ''} readOnly className="bg-gray-50" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Address</Label>
                <Input value={formatAddress(business.address)} readOnly className="bg-gray-50" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Account info */}
        {userProfile && (
          <Card className="bg-white border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Account</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={userProfile.profile_photo_url || ''} />
                  <AvatarFallback><User className="h-6 w-6" /></AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-gray-900">{userProfile.display_name || 'User'}</p>
                  <p className="text-sm text-gray-500">{userProfile.email}</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">{user?.phoneNumber || 'Not set'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-gray-400" />
                  <Badge variant={user?.role === 'admin' ? 'default' : 'secondary'}>{user?.role || 'user'}</Badge>
                </div>
                {googleAccountInfo && (
                  <>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">{googleAccountInfo.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">Synced {format(new Date(googleAccountInfo.last_synced), 'PP')}</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {!business && !loading && (
          <Card className="bg-white border-gray-200">
            <CardContent className="pt-6 text-center py-12">
              <p className="text-gray-500">No business data. Please sync your Google Business Profile.</p>
              <Button onClick={handleSync} className="mt-4" disabled={syncing} size="sm">
                <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                Sync Now
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
