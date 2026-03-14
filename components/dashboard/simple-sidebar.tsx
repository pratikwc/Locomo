"use client";

import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sparkles, Users, Puzzle, BookOpen } from 'lucide-react';

export function SimpleSidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const menuItems = [
    {
      title: 'Get Started',
      icon: Sparkles,
      path: '/dashboard',
      active: pathname === '/dashboard',
    },
    {
      title: 'Team Management',
      icon: Users,
      path: '/dashboard/team',
      active: pathname === '/dashboard/team',
    },
    {
      title: 'Integrations',
      icon: Puzzle,
      path: '/dashboard/integrations',
      active: pathname === '/dashboard/integrations',
    },
    {
      title: 'How It Works',
      icon: BookOpen,
      path: '/dashboard/how-it-works',
      active: pathname === '/dashboard/how-it-works',
    },
  ];

  return (
    <aside className="w-64 border-r bg-card flex flex-col h-full">
      <div className="p-6 border-b">
        <h2 className="text-sm font-semibold text-muted-foreground mb-1">Workspace</h2>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.path}
              variant={item.active ? "secondary" : "ghost"}
              className={`w-full justify-start ${
                item.active ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground' : ''
              }`}
              onClick={() => router.push(item.path)}
            >
              <Icon className="mr-3 h-4 w-4" />
              {item.title}
            </Button>
          );
        })}
      </nav>

      <div className="p-4 border-t space-y-2">
        <Button
          variant="ghost"
          className="w-full justify-start text-sm"
          onClick={() => {}}
        >
          Light Mode
        </Button>
        <div className="pt-4 border-t">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">GrowthPro AI</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">growthproai.com</p>
          <p className="text-xs text-muted-foreground">AI-powered local SEO platform</p>
        </div>
      </div>
    </aside>
  );
}
