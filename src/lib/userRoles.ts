/**
 * Utility functions for handling user roles, including multiple roles support
 */

/**
 * Get all roles for a user from the database
 */
export async function getUserRoles(userId?: string, email?: string): Promise<string[]> {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  try {
    let query = supabase
      .from('User')
      .select(`
        UserRole (
          role:Role (
            name
          )
        )
      `);

    if (userId) {
      query = query.eq('UserID', userId);
    } else if (email) {
      query = query.eq('Email', email.toLowerCase().trim());
    } else {
      return [];
    }

    const { data, error } = await query.single();

    if (error || !data) {
      console.error('Error fetching user roles:', error);
      return [];
    }

    const userRoles = (data as any)?.UserRole || [];
    return userRoles.map((ur: any) => ur.role?.name?.toLowerCase()).filter(Boolean);
  } catch (error) {
    console.error('Error in getUserRoles:', error);
    return [];
  }
}

/**
 * Get the currently selected role for the session
 * Checks sessionStorage first, then falls back to first role
 */
export function getSelectedRole(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('selectedRole');
}

/**
 * Set the selected role for the current session
 */
export function setSelectedRole(role: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('selectedRole', role.toLowerCase());
}

/**
 * Clear the selected role from session
 */
export function clearSelectedRole(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('selectedRole');
}

/**
 * Get user's active role (selected role or first role)
 * This is the primary role-checking function to use throughout the app
 */
export async function getActiveRole(userId?: string, email?: string): Promise<string | null> {
  // Check if there's a selected role in session
  const selectedRole = getSelectedRole();
  if (selectedRole) {
    // Verify the selected role is still valid for this user
    const userRoles = await getUserRoles(userId, email);
    if (userRoles.includes(selectedRole)) {
      return selectedRole;
    } else {
      // Selected role is no longer valid, clear it
      clearSelectedRole();
    }
  }

  // Fallback to first role if no selection or invalid selection
  const userRoles = await getUserRoles(userId, email);
  if (userRoles.length > 0) {
    return userRoles[0];
  }

  return null;
}

/**
 * Check if user has a specific role (checks all roles, not just active)
 */
export async function userHasRole(role: string, userId?: string, email?: string): Promise<boolean> {
  const userRoles = await getUserRoles(userId, email);
  return userRoles.includes(role.toLowerCase());
}

/**
 * Check if user has any of the specified roles
 */
export async function userHasAnyRole(roles: string[], userId?: string, email?: string): Promise<boolean> {
  const userRoles = await getUserRoles(userId, email);
  const lowerRoles = roles.map(r => r.toLowerCase());
  return userRoles.some(ur => lowerRoles.includes(ur));
}

/**
 * Check if user has all of the specified roles
 */
export async function userHasAllRoles(roles: string[], userId?: string, email?: string): Promise<boolean> {
  const userRoles = await getUserRoles(userId, email);
  const lowerRoles = roles.map(r => r.toLowerCase());
  return lowerRoles.every(lr => userRoles.includes(lr));
}

/**
 * Get role priority for dashboard routing
 * Higher priority = more permissions
 */
function getRolePriority(role: string): number {
  const roleLower = role.toLowerCase();
  if (roleLower.includes('super admin')) return 100;
  if (roleLower.includes('admin')) return 90;
  if (roleLower.includes('registrar')) return 80;
  if (roleLower.includes('cashier')) return 70;
  if (roleLower.includes('faculty')) return 60;
  return 50;
}

/**
 * Get the highest priority role for a user
 */
export async function getHighestPriorityRole(userId?: string, email?: string): Promise<string | null> {
  const userRoles = await getUserRoles(userId, email);
  if (userRoles.length === 0) return null;

  return userRoles.reduce((highest, current) => {
    return getRolePriority(current) > getRolePriority(highest) ? current : highest;
  });
}

/**
 * Get dashboard path for a role
 */
export function getDashboardPath(role: string): string {
  const roleLower = role.toLowerCase();
  if (roleLower.includes('admin') || roleLower.includes('super')) {
    return '/dashboard/admin';
  } else if (roleLower.includes('faculty')) {
    return '/dashboard/faculty';
  } else if (roleLower.includes('cashier')) {
    return '/dashboard/cashier';
  } else if (roleLower.includes('registrar')) {
    return '/dashboard/registrar';
  }
  return '/dashboard';
}



