import { supabase } from './supabase';

export interface CreateWorkspaceData {
  name: string;
  description?: string;
  website_url?: string;
}

export async function createWorkspace(data: CreateWorkspaceData, userId: string) {
  const slug = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .insert({
      name: data.name,
      slug: `${slug}-${Math.random().toString(36).substring(7)}`,
      description: data.description || '',
      website_url: data.website_url || null,
      subscription_tier: 'free',
      subscription_status: 'trialing',
    })
    .select()
    .single();

  if (workspaceError || !workspace) {
    throw new Error(workspaceError?.message || 'Failed to create workspace');
  }

  const { error: memberError } = await supabase
    .from('workspace_members')
    .insert({
      workspace_id: workspace.id,
      user_id: userId,
      role: 'owner',
      joined_at: new Date().toISOString(),
    });

  if (memberError) {
    throw new Error(memberError.message);
  }

  return workspace;
}

export async function getOrCreateWorkspace(data: CreateWorkspaceData, userId: string) {
  const existingWorkspaces = await getUserWorkspaces(userId);

  if (existingWorkspaces.length > 0) {
    return existingWorkspaces[0];
  }

  return await createWorkspace(data, userId);
}

export async function getUserWorkspaces(userId: string) {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('*, workspaces(*)')
    .eq('user_id', userId)
    .order('joined_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data?.map((m: any) => m.workspaces) || [];
}

export async function getWorkspaceMember(workspaceId: string, userId: string) {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function updateWorkspace(workspaceId: string, updates: Partial<CreateWorkspaceData>) {
  const { data, error } = await supabase
    .from('workspaces')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', workspaceId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function inviteTeamMember(
  workspaceId: string,
  invitedBy: string,
  email: string,
  role: 'admin' | 'manager' | 'operator' | 'analyst' | 'viewer',
  locationAccess?: string[]
) {
  // This is a simplified version. In production, you would:
  // 1. Create a user account or send an invitation email
  // 2. Create the workspace_members record
  // For now, we'll just create the record if the user exists

  const { data: users } = await supabase
    .from('users')
    .select('id')
    .eq('phone_number', email)
    .maybeSingle();

  if (!users) {
    throw new Error('User not found. They need to sign up first.');
  }

  const { data, error } = await supabase
    .from('workspace_members')
    .insert({
      workspace_id: workspaceId,
      user_id: users.id,
      role,
      invited_by: invitedBy,
      location_access: locationAccess ? locationAccess : null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function removeTeamMember(workspaceId: string, userId: string) {
  const { error } = await supabase
    .from('workspace_members')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateMemberRole(
  workspaceId: string,
  userId: string,
  role: 'admin' | 'manager' | 'operator' | 'analyst' | 'viewer',
  locationAccess?: string[]
) {
  const { data, error } = await supabase
    .from('workspace_members')
    .update({
      role,
      location_access: locationAccess ? locationAccess : null,
    })
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export function checkPermission(
  role: 'owner' | 'admin' | 'manager' | 'operator' | 'analyst' | 'viewer',
  requiredPermission: string
): boolean {
  const roleHierarchy: Record<string, string[]> = {
    owner: ['all'],
    admin: ['manage_team', 'manage_locations', 'manage_agents', 'manage_content', 'manage_reviews', 'view_analytics'],
    manager: ['manage_locations', 'manage_content', 'manage_reviews', 'view_analytics'],
    operator: ['manage_content', 'manage_reviews'],
    analyst: ['view_analytics'],
    viewer: ['view_only'],
  };

  const permissions = roleHierarchy[role] || [];
  return permissions.includes('all') || permissions.includes(requiredPermission);
}

export async function migrateUserToWorkspace(userId: string) {
  // Check if user already has a workspace
  const { data: existingMember } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existingMember) {
    return; // User already migrated
  }

  // Get user's phone number
  const { data: user } = await supabase
    .from('users')
    .select('phone_number')
    .eq('id', userId)
    .single();

  if (!user) {
    throw new Error('User not found');
  }

  // Create a default workspace for this user
  const workspace = await createWorkspace(
    {
      name: `${user.phone_number}'s Workspace`,
      description: 'Auto-migrated workspace',
    },
    userId
  );

  // Get user's existing businesses
  const { data: businesses } = await supabase
    .from('businesses')
    .select('*')
    .eq('user_id', userId);

  if (businesses && businesses.length > 0) {
    // Migrate businesses to locations
    const locationInserts = businesses.map(business => ({
      workspace_id: workspace.id,
      google_account_id: business.google_account_id,
      name: business.name,
      address: business.address ? JSON.stringify(business.address) : null,
      phone: business.phone,
      website_url: business.website,
      google_location_id: business.business_id,
      primary_category: business.category,
      additional_categories: business.additional_categories || [],
      description: business.description || '',
      latitude: business.latitude,
      longitude: business.longitude,
      connection_status: 'connected' as const,
      is_active: true,
      last_synced_at: business.last_synced_at,
    }));

    const { data: locations, error: locationError } = await supabase
      .from('locations')
      .insert(locationInserts)
      .select();

    if (locationError) {
      console.error('Error migrating locations:', locationError);
      return;
    }

    // Update reviews to point to new locations
    if (locations) {
      for (let i = 0; i < businesses.length; i++) {
        await supabase
          .from('reviews')
          .update({ location_id: locations[i].id })
          .eq('business_id', businesses[i].id);
      }
    }
  }

  // Update google_accounts to point to workspace
  await supabase
    .from('google_accounts')
    .update({ workspace_id: workspace.id })
    .eq('user_id', userId);

  return workspace;
}
