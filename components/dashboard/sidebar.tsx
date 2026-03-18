"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LayoutDashboard, Star, FileText, TrendingUp, CreditCard as Edit3, Calendar, Settings, LogOut, ChartBar as BarChart3, Users } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Reviews',
    href: '/dashboard/reviews',
    icon: Star,
  },
  {
    title: 'Posts',
    href: '/dashboard/posts',
    icon: FileText,
  },
  {
    title: 'Keywords',
    href: '/dashboard/keywords',
    icon: TrendingUp,
  },
  {
    title: 'Profile Editor',
    href: '/dashboard/profile',
    icon: Edit3,
  },
  {
    title: 'Analytics',
    href: '/dashboard/analytics',
    icon: BarChart3,
  },
  {
    title: 'Events',
    href: '/dashboard/events',
    icon: Calendar,
  },
  {
    title: 'Admin',
    href: '/admin',
    icon: Users,
    adminOnly: true,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const filteredNavItems = navItems.filter(
    (item) => !item.adminOnly || user?.role === 'admin'
  );

  return (
    <div className="flex h-full w-64 flex-col border-r bg-growmatiq-beige">
      <div className="flex h-16 items-center justify-between border-b bg-white px-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#6931FF' }}>
            <span className="text-lg font-bold text-growmatiq-beige">G</span>
          </div>
          <span className="text-lg font-bold text-growmatiq-dark">Growmatiq</span>
        </div>
      </div>

      <div className="px-3 pt-4 pb-2">
        <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Workspace
        </p>
      </div>

      <ScrollArea className="flex-1 px-3">
        <nav className="space-y-1 pb-4">
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
                    ? 'shadow-sm'
                    : 'text-growmatiq-dark hover:bg-white/60'
                )}
                style={isActive ? { backgroundColor: '#6931FF', color: '#f5f1ed' } : undefined}
              >
                <Icon className="h-4 w-4" />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="border-t bg-white p-3 space-y-2">
        <Link href="/dashboard/settings" className="block">
          <Button variant="ghost" className="w-full justify-start text-sm h-9">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </Link>
        <Button
          variant="ghost"
          className="w-full justify-start text-sm h-9 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>

      <div className="border-t bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-growmatiq-beige" style={{ backgroundColor: '#6931FF' }}>
            {user?.phoneNumber?.slice(-2) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {user?.phoneNumber || 'User'}
            </p>
            <p className="text-xs text-gray-500">
              {user?.role === 'admin' ? 'Administrator' : 'User'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
