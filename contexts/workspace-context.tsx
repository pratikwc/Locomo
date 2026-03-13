"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string;
  website_url: string | null;
  logo_url: string | null;
  subscription_tier: 'free' | 'starter' | 'pro' | 'enterprise';
  subscription_status: 'active' | 'trialing' | 'canceled' | 'past_due';
  trial_ends_at: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'manager' | 'operator' | 'analyst' | 'viewer';
  invited_by: string | null;
  invited_at: string;
  joined_at: string;
  location_access: string[] | null;
  created_at: string;
}

export interface Location {
  id: string;
  workspace_id: string;
  google_account_id: string | null;
  name: string;
  store_code: string | null;
  address: string | null;
  phone: string | null;
  website_url: string | null;
  google_location_id: string | null;
  google_place_id: string | null;
  primary_category: string | null;
  additional_categories: string[];
  description: string;
  latitude: number | null;
  longitude: number | null;
  verification_status: string;
  connection_status: 'connected' | 'disconnected' | 'error';
  health_score: number;
  seo_score: number;
  assigned_manager_id: string | null;
  is_active: boolean;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

interface WorkspaceContextType {
  workspace: Workspace | null;
  workspaces: Workspace[];
  member: WorkspaceMember | null;
  selectedLocation: Location | null;
  locations: Location[];
  isLoading: boolean;
  setWorkspace: (workspace: Workspace | null) => void;
  setSelectedLocation: (location: Location | null) => void;
  refreshWorkspace: () => Promise<void>;
  refreshLocations: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  canAccessLocation: (locationId: string) => boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [member, setMember] = useState<WorkspaceMember | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshWorkspace = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberData } = await supabase
        .from('workspace_members')
        .select('*, workspaces(*)')
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false });

      if (memberData && memberData.length > 0) {
        const allWorkspaces = memberData.map((m: any) => m.workspaces);
        setWorkspaces(allWorkspaces);

        const savedWorkspaceId = localStorage.getItem('selected_workspace_id');
        let currentWorkspace = null;

        if (savedWorkspaceId) {
          const found = memberData.find((m: any) => m.workspace_id === savedWorkspaceId);
          if (found) {
            currentWorkspace = found.workspaces;
            setMember(found);
          }
        }

        if (!currentWorkspace && memberData[0]) {
          currentWorkspace = memberData[0].workspaces;
          setMember(memberData[0]);
        }

        if (currentWorkspace) {
          setWorkspace(currentWorkspace);
          localStorage.setItem('selected_workspace_id', currentWorkspace.id);
        }
      }
    } catch (error) {
      console.error('Error loading workspace:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshLocations = async () => {
    if (!workspace) return;

    try {
      const { data: locationData } = await supabase
        .from('locations')
        .select('*')
        .eq('workspace_id', workspace.id)
        .eq('is_active', true)
        .order('name');

      if (locationData) {
        setLocations(locationData);

        const savedLocationId = localStorage.getItem('selected_location_id');
        if (savedLocationId) {
          const found = locationData.find(l => l.id === savedLocationId);
          if (found) {
            setSelectedLocation(found);
          }
        }
      }
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  useEffect(() => {
    refreshWorkspace();
  }, []);

  useEffect(() => {
    if (workspace) {
      refreshLocations();
    }
  }, [workspace]);

  const hasPermission = (permission: string): boolean => {
    if (!member) return false;

    const roleHierarchy = {
      owner: ['all'],
      admin: ['manage_team', 'manage_locations', 'manage_agents', 'view_analytics'],
      manager: ['manage_locations', 'manage_content', 'view_analytics'],
      operator: ['manage_content', 'manage_reviews'],
      analyst: ['view_analytics'],
      viewer: ['view_only'],
    };

    const userPermissions = roleHierarchy[member.role] || [];
    return userPermissions.includes('all') || userPermissions.includes(permission);
  };

  const canAccessLocation = (locationId: string): boolean => {
    if (!member) return false;
    if (member.role === 'owner' || member.role === 'admin') return true;
    if (!member.location_access) return true;
    return member.location_access.includes(locationId);
  };

  const handleSetWorkspace = (newWorkspace: Workspace | null) => {
    setWorkspace(newWorkspace);
    if (newWorkspace) {
      localStorage.setItem('selected_workspace_id', newWorkspace.id);
    } else {
      localStorage.removeItem('selected_workspace_id');
    }
  };

  const handleSetSelectedLocation = (location: Location | null) => {
    setSelectedLocation(location);
    if (location) {
      localStorage.setItem('selected_location_id', location.id);
    } else {
      localStorage.removeItem('selected_location_id');
    }
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspace,
        workspaces,
        member,
        selectedLocation,
        locations,
        isLoading,
        setWorkspace: handleSetWorkspace,
        setSelectedLocation: handleSetSelectedLocation,
        refreshWorkspace,
        refreshLocations,
        hasPermission,
        canAccessLocation,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
