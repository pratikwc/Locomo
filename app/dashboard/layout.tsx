"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useWorkspace } from '@/contexts/workspace-context';
import { GrowmatiqSidebar } from '@/components/dashboard/growmatiq-sidebar';
import { SimpleSidebar } from '@/components/dashboard/simple-sidebar';
import { LocationSwitcher } from '@/components/location-switcher';
import { Loader as Loader2, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getOrCreateWorkspace } from '@/lib/workspace-utils';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading: authLoading, hasGoogleAccount } = useAuth();
  const { workspace, isLoading: workspaceLoading, refreshWorkspace } = useWorkspace();
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const createDefaultWorkspace = async () => {
      if (!authLoading && user && !workspaceLoading && !workspace && !creatingWorkspace) {
        setCreatingWorkspace(true);
        try {
          await getOrCreateWorkspace(
            {
              name: `${user.phoneNumber}'s Workspace`,
              description: 'My workspace',
            },
            user.id
          );
          await refreshWorkspace();
        } catch (error) {
          console.error('Failed to create workspace:', error);
        } finally {
          setCreatingWorkspace(false);
        }
      }
    };

    createDefaultWorkspace();
  }, [user, authLoading, workspace, workspaceLoading, creatingWorkspace, refreshWorkspace]);

  if (authLoading || workspaceLoading || creatingWorkspace) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading Growmatiq...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const showFullDashboard = hasGoogleAccount && workspace;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {showFullDashboard ? <GrowmatiqSidebar /> : <SimpleSidebar />}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b bg-card flex items-center justify-between px-6">
          {showFullDashboard ? (
            <LocationSwitcher />
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <span className="text-xl font-bold text-primary-foreground">G</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">GrowthPro AI</h1>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="text-xs">
              TRIAL (12 DAYS LEFT)
            </Button>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-primary rounded-full" />
            </Button>
            <Button variant="default" size="sm" className="gap-2">
              <span className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-xs font-bold">
                {user?.phoneNumber?.charAt(0) || 'U'}
              </span>
              {user?.phoneNumber || 'User'}
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
