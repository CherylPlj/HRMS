/**
 * Server-side utility functions for checking user roles and permissions
 */

import { currentUser } from '@clerk/nextjs/server';

/**
 * Check if the current user is an admin (admin or super admin)
 * Returns true if user is admin, false otherwise
 */
export async function isUserAdmin(): Promise<boolean> {
  try {
    const user = await currentUser();
    if (!user) return false;
    
    // Check Clerk publicMetadata first
    const role = user.publicMetadata?.role;
    if (role) {
      const roleStr = role.toString().toLowerCase();
      return roleStr.includes('admin') || roleStr.includes('super admin') || roleStr.includes('superadmin');
    }
    
    return false;
  } catch (error) {
    console.error('Error checking admin role:', error);
    return false;
  }
}

