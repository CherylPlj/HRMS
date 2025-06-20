export async function getUserRoleFlexible(user: any): Promise<string | null> {
  // 1. Check Clerk metadata
  const metaRole = user?.publicMetadata?.role;
  if (metaRole && typeof metaRole === 'string') {
    return metaRole.toLowerCase();
  }

  // 2. Fallback to DB via API
  try {
    const response = await fetch('/api/verifyUserRole', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user?.primaryEmailAddress?.emailAddress }),
    });
    if (response.ok) {
      const userData = await response.json();
      const userRoles = userData.Role;
      if (userRoles && userRoles.length > 0) {
        return userRoles[0].toLowerCase();
      }
    }
  } catch (e) {
    console.error('Error checking user role:', e);
  }
  return null;
} 