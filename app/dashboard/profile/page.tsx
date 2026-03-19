"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, User, Phone, Mail, Shield, Calendar, Link2, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { format } from 'date-fns';
import { api } from '@/lib/api-client';

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

interface UserProfile {
  display_name: string | null;
  profile_photo_url: string | null;
  email: string;
}

export default function ProfilePage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [googleAccountInfo, setGoogleAccountInfo] = useState<{
    email: string;
    connected_at: string;
    last_synced: string;
  } | null>(null);

  const fetchData = async () => {
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
          connected_at: statusData.last_synced || new Date().toISOString(),
          last_synced: statusData.last_synced || new Date().toISOString(),
        });

        if (statusData.businesses?.length > 0) {
          const businessData = await api.get<Business>(`/api/businesses/${statusData.businesses[0].id}`);
          setBusiness(businessData);
        }
      }
    } catch (error) {
      console.error('[Profile] Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const data = await api.post<{ message?: string }>('/api/gmb/sync-businesses');
      toast({ title: 'Sync Complete', description: data.message });
      await fetchData();
    } catch (error: any) {
      toast({
        title: 'Sync Failed',
        description: error.message || 'Failed to sync business data',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const DAYS_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  const DAY_LABELS: Record<string, string> = {
    MONDAY: 'Monday', TUESDAY: 'Tuesday', WEDNESDAY: 'Wednesday',
    THURSDAY: 'Thursday', FRIDAY: 'Friday', SATURDAY: 'Saturday', SUNDAY: 'Sunday',
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hourStr, minuteStr] = time.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = minuteStr || '00';
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minute} ${ampm}`;
  };

  const getHoursByDay = (hours: any): Record<string, { open: string; close: string }[]> => {
    if (!hours?.periods?.length) return {};
    const map: Record<string, { open: string; close: string }[]> = {};
    for (const period of hours.periods) {
      const day = period.openDay;
      if (!day) continue;
      if (!map[day]) map[day] = [];
      map[day].push({ open: period.openTime || '', close: period.closeTime || '' });
    }
    return map;
  };

  const formatAddress = (address: any) => {
    if (!address) return '';
    const parts = [
      ...(address.addressLines || []),
      address.locality,
      address.administrativeArea,
      address.postalCode,
    ].filter(Boolean);
    return parts.join(', ');
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {userProfile && (
        <Card className="bg-gradient-to-r from-slate-50 to-slate-100">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={userProfile.profile_photo_url || ''} />
                <AvatarFallback>
                  <User className="h-8 w-8" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-slate-900">
                  {userProfile.display_name || 'User'}
                </h2>
                <p className="text-slate-600">{userProfile.email}</p>
              </div>
              <Button
                onClick={handleSync}
                disabled={syncing}
                variant="outline"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync Now'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your account and connection details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-slate-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">Phone Number</p>
                  <p className="text-sm text-slate-600 mt-1">
                    {user?.phoneNumber || 'Not available'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-slate-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">Account Role</p>
                  <div className="mt-1">
                    <Badge variant={user?.role === 'admin' ? 'default' : 'secondary'}>
                      {user?.role || 'user'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-slate-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">Account Status</p>
                  <div className="mt-1">
                    <Badge
                      variant={user?.status === 'active' ? 'default' : 'destructive'}
                    >
                      {user?.status || 'active'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {googleAccountInfo && (
                <>
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-slate-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">Google Account</p>
                      <p className="text-sm text-slate-600 mt-1">
                        {googleAccountInfo.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Link2 className="h-5 w-5 text-slate-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">Connection Status</p>
                      <div className="mt-1">
                        <Badge variant="default" className="bg-green-600">
                          Connected
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-slate-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">Last Synced</p>
                      <p className="text-sm text-slate-600 mt-1">
                        {format(new Date(googleAccountInfo.last_synced), 'PPp')}
                      </p>
                    </div>
                  </div>
                </>
              )}
              {!googleAccountInfo && (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-slate-500">No Google account connected</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Business Profile</h1>
          <p className="text-gray-500 mt-1">View your Google Business Profile information</p>
        </div>
      </div>

      {business ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Your business details from Google</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Business Name</Label>
                  <Input id="name" value={business.name || ''} readOnly />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input id="category" value={business.category || ''} readOnly />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Business Description</Label>
                <Textarea
                  id="description"
                  value={business.description || ''}
                  rows={4}
                  readOnly
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" value={business.phone || ''} readOnly />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" type="url" value={business.website || ''} readOnly />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" value={formatAddress(business.address)} readOnly />
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <p className="text-slate-500">No business data available. Please sync your Google Business Profile.</p>
            <Button onClick={handleSync} className="mt-4" disabled={syncing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              Sync Business Data
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-slate-500" />
            <div>
              <CardTitle>Business Hours</CardTitle>
              <CardDescription>Regular hours from your Google Business Profile</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {business?.hours?.periods?.length ? (
            <div className="divide-y divide-slate-100">
              {(() => {
                const hoursByDay = getHoursByDay(business.hours);
                return DAYS_ORDER.map((day) => {
                  const periods = hoursByDay[day];
                  const isWeekend = day === 'SATURDAY' || day === 'SUNDAY';
                  return (
                    <div key={day} className={`flex items-center py-3 ${isWeekend ? 'bg-slate-50/50 rounded' : ''}`}>
                      <div className="w-32 text-sm font-medium text-slate-700">
                        {DAY_LABELS[day]}
                      </div>
                      <div className="flex-1">
                        {periods?.length ? (
                          <div className="flex flex-wrap gap-2">
                            {periods.map((period, i) => (
                              <span key={i} className="inline-flex items-center gap-1.5 text-sm text-slate-800 bg-blue-50 border border-blue-100 rounded-md px-2.5 py-1">
                                <span className="font-medium">{formatTime(period.open)}</span>
                                <span className="text-slate-400">–</span>
                                <span className="font-medium">{formatTime(period.close)}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="inline-flex items-center text-sm text-slate-400 bg-slate-100 rounded-md px-2.5 py-1">
                            Closed
                          </span>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Clock className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No hours data available. Sync your business profile to load hours.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
