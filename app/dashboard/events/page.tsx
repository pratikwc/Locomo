"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus } from 'lucide-react';

export default function EventsPage() {
  const mockEvents = [
    {
      id: '1',
      title: 'Summer Sale Event',
      description: '20% off all services during summer',
      start: new Date('2024-06-15'),
      end: new Date('2024-08-31'),
      status: 'published',
    },
    {
      id: '2',
      title: 'Grand Opening Celebration',
      description: 'Join us for our grand opening!',
      start: new Date('2024-07-01'),
      end: new Date('2024-07-01'),
      status: 'draft',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Events</h1>
          <p className="text-gray-500 mt-1">Create and manage business events</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Event
        </Button>
      </div>

      <div className="grid gap-4">
        {mockEvents.map((event) => (
          <Card key={event.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex gap-3">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold">{event.title}</h3>
                      <Badge
                        variant={event.status === 'published' ? 'default' : 'outline'}
                      >
                        {event.status}
                      </Badge>
                    </div>
                    <p className="text-gray-600 mb-2">{event.description}</p>
                    <p className="text-sm text-gray-500">
                      {event.start.toLocaleDateString()} - {event.end.toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
