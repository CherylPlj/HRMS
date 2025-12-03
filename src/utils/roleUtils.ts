/**
 * Utility functions for checking user roles and permissions
 */

/**
 * Check if a user is an admin (admin or super admin)
 */
export function isAdmin(user: any): boolean {
  if (!user) return false;
  
  // Check Clerk publicMetadata first
  const role = user.publicMetadata?.role;
  if (role) {
    const roleStr = role.toString().toLowerCase();
    return roleStr.includes('admin') || roleStr.includes('super admin') || roleStr.includes('superadmin');
  }
  
  return false;
}

/**
 * Get user role as string
 */
export function getUserRoleString(user: any): string | null {
  if (!user) return null;
  
  const role = user.publicMetadata?.role;
  if (role) {
    return role.toString().toLowerCase();
  }
  
  return null;
}

