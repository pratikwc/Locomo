"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LayoutDashboard, MapPin, Star, FileText, Search, Users, Lightbulb, Bot, ChartBar as BarChart3, Plug, Settings, LogOut, ChevronDown, Building2, CircleUser as UserCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useWorkspace } from '@/contexts/workspace-context';
import { useState } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  {
    title: 'Overview',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Locations',
    href: '/dashboard/locations',
    icon: MapPin,
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
    title: 'SEO Health',
    href: '/dashboard/seo-health',
    icon: Search,
  },
  {
    title: 'Competitors',
    href: '/dashboard/competitors',
    icon: Users,
  },
  {
    title: 'Recommendations',
    href: '/dashboard/recommendations',
    icon: Lightbulb,
  },
  {
    title: 'Agents',
    href: '/dashboard/agents',
    icon: Bot,
  },
  {
    title: 'Analytics',
    href: '/dashboard/analytics',
    icon: BarChart3,
  },
  {
    title: 'Team',
    href: '/dashboard/team',
    icon: Users,
  },
  {
    title: 'Integrations',
    href: '/dashboard/integrations',
    icon: Plug,
  },
];

export function GrowmatiqSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { workspace, member } = useWorkspace();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const toggleSection = (title: string) => {
    setOpenSections(prev => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  return (
    <div className="flex h-full w-64 flex-col border-r bg-background">
      <div className="flex h-16 items-center justify-between border-b px-4 bg-card">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-lg font-bold text-primary-foreground">G</span>
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Growmatiq
          </span>
        </Link>
      </div>

      {workspace && (
        <div className="px-4 pt-4 pb-2 border-b">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Workspace
            </p>
          </div>
          <div className="mt-2">
            <p className="text-sm font-semibold text-foreground truncate">
              {workspace.name}
            </p>
            {member && (
              <p className="text-xs text-muted-foreground capitalize">
                {member.role}
              </p>
            )}
          </div>
        </div>
      )}

      <ScrollArea className="flex-1 px-3">
        <nav className="space-y-1 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href ||
              (item.children?.some(child => pathname === child.href));
            const hasChildren = item.children && item.children.length > 0;

            if (hasChildren) {
              return (
                <Collapsible
                  key={item.title}
                  open={openSections[item.title] || isActive}
                  onOpenChange={() => toggleSection(item.title)}
                >
                  <CollapsibleTrigger className="w-full">
                    <div
                      className={cn(
                        'flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors w-full',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-foreground/70 hover:bg-accent hover:text-foreground'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4" />
                        {item.title}
                      </div>
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 transition-transform',
                          (openSections[item.title] || isActive) && 'rotate-180'
                        )}
                      />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-7 mt-1 space-y-1">
                    {item.children?.map((child) => {
                      const ChildIcon = child.icon;
                      const isChildActive = pathname === child.href;

                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                            isChildActive
                              ? 'bg-primary/10 text-primary'
                              : 'text-foreground/60 hover:bg-accent hover:text-foreground'
                          )}
                        >
                          <ChildIcon className="h-3 w-3" />
                          {child.title}
                        </Link>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground/70 hover:bg-accent hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.title}
                {item.badge && (
                  <span className="ml-auto text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="border-t bg-card p-3 space-y-2">
        <Link href="/dashboard/settings" className="block">
          <Button variant="ghost" className="w-full justify-start text-sm h-9">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </Link>
        <Button
          variant="ghost"
          className="w-full justify-start text-sm h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>

      <div className="border-t bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-semibold">
            <UserCircle className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {user?.phoneNumber || 'User'}
            </p>
            <p className="text-xs text-muted-foreground">
              {member?.role ? member.role.charAt(0).toUpperCase() + member.role.slice(1) : 'User'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
