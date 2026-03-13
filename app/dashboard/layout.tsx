"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useWorkspace } from '@/contexts/workspace-context';
import { GrowmatiqSidebar } from '@/components/dashboard/growmatiq-sidebar';
import { LocationSwitcher } from '@/components/location-switcher';
import { Loader as Loader2, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { workspace, isLoading: workspaceLoading } = useWorkspace();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!authLoading && user && !workspaceLoading && !workspace) {
      router.replace('/onboarding');
    }
  }, [user, authLoading, workspace, workspaceLoading, router]);

  if (authLoading || workspaceLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading Growmatiq...</p>
        </div>
      </div>
    );
  }

  if (!user || !workspace) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <GrowmatiqSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b bg-card flex items-center justify-between px-6">
          <LocationSwitcher />
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-primary rounded-full" />
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
