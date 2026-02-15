"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  LayoutDashboard,
  Star,
  FileText,
  TrendingUp,
  Edit3,
  Calendar,
  Settings,
  LogOut,
  BarChart3,
  Users,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  requiresGoogle?: boolean;
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    requiresGoogle: true,
  },
  {
    title: 'Reviews',
    href: '/dashboard/reviews',
    icon: Star,
    requiresGoogle: true,
  },
  {
    title: 'Posts',
    href: '/dashboard/posts',
    icon: FileText,
    requiresGoogle: true,
  },
  {
    title: 'Keywords',
    href: '/dashboard/keywords',
    icon: TrendingUp,
    requiresGoogle: true,
  },
  {
    title: 'Profile Editor',
    href: '/dashboard/profile',
    icon: Edit3,
    requiresGoogle: false,
  },
  {
    title: 'Analytics',
    href: '/dashboard/analytics',
    icon: BarChart3,
    requiresGoogle: true,
  },
  {
    title: 'Events',
    href: '/dashboard/events',
    icon: Calendar,
    requiresGoogle: true,
  },
  {
    title: 'Admin',
    href: '/admin',
    icon: Users,
    adminOnly: true,
    requiresGoogle: true,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, hasGoogleAccount } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const filteredNavItems = navItems.filter((item) => {
    // Filter admin-only items
    if (item.adminOnly && user?.role !== 'admin') {
      return false;
    }

    // Filter items that require Google connection
    if (item.requiresGoogle && hasGoogleAccount === false) {
      return false;
    }

    return true;
  });

  return (
    <div className="flex h-full w-64 flex-col border-r bg-white">
      <div className="flex h-16 items-center border-b px-6">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center">
            <span className="text-lg font-bold text-white">L</span>
          </div>
          <span className="text-xl font-bold">Locomo</span>
        </div>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {hasGoogleAccount === false && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-800 mb-2 font-medium">
                Connect your Google account to unlock all features
              </p>
              <Link href="/google-connect">
                <Button size="sm" className="w-full bg-amber-600 hover:bg-amber-700">
                  Connect Google
                </Button>
              </Link>
            </div>
          )}

          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <Icon className="h-5 w-5" />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="border-t p-4 space-y-2">
        <Link href="/dashboard/settings">
          <Button variant="ghost" className="w-full justify-start">
            <Settings className="mr-2 h-5 w-5" />
            Settings
          </Button>
        </Link>
        <Button
          variant="ghost"
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-5 w-5" />
          Logout
        </Button>
      </div>
    </div>
  );
}
