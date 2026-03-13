"use client";

import { useState } from 'react';
import { useWorkspace } from '@/contexts/workspace-context';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader as Loader2 } from 'lucide-react';
import { createWorkspace } from '@/lib/workspace-utils';
import { toast } from 'sonner';

interface StepCreateWorkspaceProps {
  onNext: (data?: any) => void;
}

export function StepCreateWorkspace({ onNext }: StepCreateWorkspaceProps) {
  const { user } = useAuth();
  const { refreshWorkspace } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    website_url: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      toast.error('User not found');
      return;
    }

    if (!formData.name.trim()) {
      toast.error('Workspace name is required');
      return;
    }

    setLoading(true);

    try {
      const workspace = await createWorkspace(formData, user.id);
      await refreshWorkspace();
      toast.success('Workspace created successfully!');
      onNext(formData);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create workspace');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="name" className="text-base">
          Workspace Name *
        </Label>
        <Input
          id="name"
          placeholder="My Business Inc."
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="mt-2"
          required
        />
        <p className="text-sm text-muted-foreground mt-1">
          This will be the name of your workspace visible to team members
        </p>
      </div>

      <div>
        <Label htmlFor="description" className="text-base">
          Description
        </Label>
        <Textarea
          id="description"
          placeholder="Brief description of your business..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="mt-2"
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="website_url" className="text-base">
          Website URL
        </Label>
        <Input
          id="website_url"
          type="url"
          placeholder="https://example.com"
          value={formData.website_url}
          onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
          className="mt-2"
        />
        <p className="text-sm text-muted-foreground mt-1">
          Used for AI brand intelligence generation
        </p>
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Creating Workspace...
          </>
        ) : (
          'Create Workspace & Continue'
        )}
      </Button>
    </form>
  );
}
