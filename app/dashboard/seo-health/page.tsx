"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search } from 'lucide-react';

export default function SEOHealthPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">SEO Health</h1>
        <p className="text-muted-foreground mt-1">
          Monitor and optimize your local SEO performance
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>SEO Health monitoring will be available soon</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-12">
          <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            Track NAP consistency, profile completeness, and more
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
