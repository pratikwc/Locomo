"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SimpleProgress } from '@/components/simple-progress';
import { Sparkles, TrendingUp, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function KeywordsPage() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const mockKeywords = [
    { keyword: 'best coffee shop near me', volume: 8900, competition: 'high', relevance: 95 },
    { keyword: 'coffee shop downtown', volume: 5400, competition: 'medium', relevance: 90 },
    { keyword: 'artisan coffee', volume: 3200, competition: 'low', relevance: 85 },
    { keyword: 'local cafe', volume: 2800, competition: 'medium', relevance: 88 },
    { keyword: 'specialty coffee', volume: 2100, competition: 'low', relevance: 82 },
    { keyword: 'coffee and pastries', volume: 1900, competition: 'low', relevance: 80 },
  ];

  const handleGenerate = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast({
        title: 'Keywords Generated',
        description: 'AI has generated keyword suggestions based on your business',
      });
    }, 2000);
  };

  const getCompetitionColor = (competition: string) => {
    switch (competition) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Keyword Planner</h1>
          <p className="text-gray-500 mt-1">
            Discover keywords to improve your visibility
          </p>
        </div>
        <Button onClick={handleGenerate} disabled={loading}>
          <Sparkles className="mr-2 h-4 w-4" />
          {loading ? 'Generating...' : 'Generate Keywords'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recommended Keywords</CardTitle>
          <CardDescription>
            Keywords tailored to your business category and location
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockKeywords.map((item, index) => (
              <div
                key={index}
                className="border rounded-lg p-4 hover:border-blue-200 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Search className="h-4 w-4 text-gray-400" />
                      <h3 className="font-semibold">{item.keyword}</h3>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span>{item.volume.toLocaleString()} monthly searches</span>
                      <Badge variant={getCompetitionColor(item.competition)}>
                        {item.competition} competition
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">
                      {item.relevance}%
                    </div>
                    <div className="text-xs text-gray-500">relevance</div>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Relevance Score</span>
                    <span className="font-medium">{item.relevance}%</span>
                  </div>
                  <SimpleProgress value={item.relevance} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How to Use Keywords</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 font-semibold">
                1
              </div>
              <div>
                <h4 className="font-semibold mb-1">Business Description</h4>
                <p className="text-sm text-gray-600">
                  Include relevant keywords naturally in your business description
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 font-semibold">
                2
              </div>
              <div>
                <h4 className="font-semibold mb-1">Posts and Updates</h4>
                <p className="text-sm text-gray-600">
                  Use keywords when creating posts to improve discoverability
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 font-semibold">
                3
              </div>
              <div>
                <h4 className="font-semibold mb-1">Review Responses</h4>
                <p className="text-sm text-gray-600">
                  Incorporate keywords in your responses to customer reviews
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
