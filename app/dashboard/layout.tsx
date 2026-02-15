"use client";

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, hasGoogleAccount } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
      return;
    }

    // Check if Google connection is required for this route
    // Allow profile page without Google connection
    const allowedWithoutGoogle = ['/dashboard/profile'];
    const requiresGoogle = !allowedWithoutGoogle.includes(pathname);

    // If user is authenticated but hasn't connected Google, redirect to connect page
    if (!loading && user && hasGoogleAccount === false && requiresGoogle) {
      router.replace('/google-connect');
    }
  }, [user, loading, hasGoogleAccount, pathname, router]);

  if (loading || hasGoogleAccount === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Show loading if Google connection check is still pending for protected routes
  const allowedWithoutGoogle = ['/dashboard/profile'];
  const requiresGoogle = !allowedWithoutGoogle.includes(pathname);

  if (requiresGoogle && hasGoogleAccount === false) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
