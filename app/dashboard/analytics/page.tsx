"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Phone, Navigation, MousePointer, TrendingUp, TrendingDown } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export default function AnalyticsPage() {
  const viewsData = [
    { date: 'Mon', views: 120, searches: 80 },
    { date: 'Tue', views: 150, searches: 95 },
    { date: 'Wed', views: 180, searches: 110 },
    { date: 'Thu', views: 160, searches: 100 },
    { date: 'Fri', views: 200, searches: 130 },
    { date: 'Sat', views: 250, searches: 160 },
    { date: 'Sun', views: 220, searches: 140 },
  ];

  const actionsData = [
    { date: 'Mon', phone: 12, website: 25, directions: 18 },
    { date: 'Tue', phone: 15, website: 30, directions: 22 },
    { date: 'Wed', phone: 18, website: 35, directions: 25 },
    { date: 'Thu', phone: 14, website: 28, directions: 20 },
    { date: 'Fri', phone: 20, website: 40, directions: 30 },
    { date: 'Sat', phone: 25, website: 45, directions: 35 },
    { date: 'Sun', phone: 22, website: 38, directions: 28 },
  ];

  const topQueries = [
    { query: 'coffee shop near me', impressions: 1250 },
    { query: 'best coffee downtown', impressions: 890 },
    { query: 'artisan coffee', impressions: 650 },
    { query: 'local cafe', impressions: 520 },
    { query: 'coffee and pastries', impressions: 410 },
  ];

  const stats = [
    {
      title: 'Total Views',
      value: '1,280',
      change: '+15.3%',
      trend: 'up',
      icon: Eye,
    },
    {
      title: 'Phone Calls',
      value: '126',
      change: '+8.7%',
      trend: 'up',
      icon: Phone,
    },
    {
      title: 'Direction Requests',
      value: '178',
      change: '+12.1%',
      trend: 'up',
      icon: Navigation,
    },
    {
      title: 'Website Clicks',
      value: '241',
      change: '+6.4%',
      trend: 'up',
      icon: MousePointer,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 mt-1">
          Track your Google Business Profile performance
        </p>
      </div>

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
                  <TrendIcon className="mr-1 h-3 w-3 text-green-600" />
                  <span className="text-green-600">{stat.change}</span>
                  <span className="text-gray-500 ml-1">vs last week</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="views">
        <TabsList>
          <TabsTrigger value="views">Views & Searches</TabsTrigger>
          <TabsTrigger value="actions">Customer Actions</TabsTrigger>
          <TabsTrigger value="queries">Search Queries</TabsTrigger>
        </TabsList>

        <TabsContent value="views" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Views & Search Appearances</CardTitle>
              <CardDescription>Last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={viewsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="views"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Profile Views"
                  />
                  <Line
                    type="monotone"
                    dataKey="searches"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Search Appearances"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Actions</CardTitle>
              <CardDescription>Last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={actionsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="phone" fill="#3b82f6" name="Phone Calls" />
                  <Bar dataKey="website" fill="#10b981" name="Website Clicks" />
                  <Bar dataKey="directions" fill="#f59e0b" name="Directions" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Search Queries</CardTitle>
              <CardDescription>
                Keywords customers used to find your business
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topQueries.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-sm">
                        {index + 1}
                      </div>
                      <span className="font-medium">{item.query}</span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {item.impressions} impressions
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
