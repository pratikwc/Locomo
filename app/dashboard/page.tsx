"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SimpleProgress } from '@/components/simple-progress';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  TrendingUp,
  TrendingDown,
  Star,
  MessageSquare,
  Eye,
  Phone,
  Navigation,
  MousePointer,
  AlertCircle,
} from 'lucide-react';

export default function DashboardPage() {
  const [healthScore, setHealthScore] = useState(75);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    return 'Needs Improvement';
  };

  const actionItems = [
    {
      title: 'Respond to 3 pending reviews',
      description: 'Improve customer engagement',
      priority: 'high',
    },
    {
      title: 'Add 5 more photos',
      description: 'Enhance visual appeal',
      priority: 'medium',
    },
    {
      title: 'Create weekly post',
      description: 'Increase visibility',
      priority: 'medium',
    },
    {
      title: 'Update business hours',
      description: 'Keep information accurate',
      priority: 'low',
    },
  ];

  const stats = [
    {
      title: 'Profile Views',
      value: '1,234',
      change: '+12.5%',
      trend: 'up',
      icon: Eye,
    },
    {
      title: 'Average Rating',
      value: '4.5',
      change: '+0.2',
      trend: 'up',
      icon: Star,
    },
    {
      title: 'Total Reviews',
      value: '89',
      change: '+5',
      trend: 'up',
      icon: MessageSquare,
    },
    {
      title: 'Phone Calls',
      value: '45',
      change: '+8.3%',
      trend: 'up',
      icon: Phone,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Welcome back! Here's your business performance overview.
          </p>
        </div>
      </div>

      <Card className="border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Google Health Score</CardTitle>
              <CardDescription className="mt-1">
                Overall profile health and optimization status
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Download Report
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-32 h-32 rounded-full border-8 border-gray-200 flex items-center justify-center">
                <div className={`text-4xl font-bold ${getScoreColor(healthScore)}`}>
                  {healthScore}
                </div>
              </div>
              <div className="absolute inset-0 rounded-full border-8 border-transparent border-t-blue-600 animate-spin-slow"></div>
            </div>

            <div className="flex-1">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">Profile Completeness</span>
                <span className="text-sm font-medium">85%</span>
              </div>
              <SimpleProgress value={85} className="mb-4" />

              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">Review Response Rate</span>
                <span className="text-sm font-medium">70%</span>
              </div>
              <SimpleProgress value={70} className="mb-4" />

              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">Posting Frequency</span>
                <span className="text-sm font-medium">60%</span>
              </div>
              <SimpleProgress value={60} />
            </div>
          </div>

          <div className="pt-4 border-t">
            <h3 className="font-semibold mb-3 flex items-center">
              <AlertCircle className="mr-2 h-5 w-5 text-blue-600" />
              Action Items to Improve Your Score
            </h3>
            <div className="grid gap-3">
              {actionItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border bg-white"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{item.title}</p>
                      <Badge
                        variant={
                          item.priority === 'high'
                            ? 'destructive'
                            : item.priority === 'medium'
                            ? 'default'
                            : 'secondary'
                        }
                        className="text-xs"
                      >
                        {item.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                  </div>
                  <Button size="sm" variant="ghost">
                    Take Action
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const TrendIcon = stat.trend === 'up' ? TrendingUp : TrendingDown;

          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
                <div className="flex items-center text-xs mt-1">
                  <TrendIcon
                    className={`mr-1 h-3 w-3 ${
                      stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                    }`}
                  />
                  <span
                    className={
                      stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                    }
                  >
                    {stat.change}
                  </span>
                  <span className="text-gray-500 ml-1">vs last month</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Reviews</CardTitle>
            <CardDescription>Latest customer feedback</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 pb-4 border-b last:border-0">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">John Doe</p>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className="h-3 w-3 fill-yellow-400 text-yellow-400"
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      Great service and friendly staff. Highly recommend!
                    </p>
                    <p className="text-xs text-gray-400 mt-1">2 days ago</p>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4">
              View All Reviews
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage your business profile</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <MessageSquare className="mr-2 h-4 w-4" />
              Create New Post
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Star className="mr-2 h-4 w-4" />
              Respond to Reviews
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <TrendingUp className="mr-2 h-4 w-4" />
              Generate Keywords
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Eye className="mr-2 h-4 w-4" />
              View Analytics
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
