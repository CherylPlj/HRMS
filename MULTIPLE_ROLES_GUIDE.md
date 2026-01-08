# Multiple Roles Login Guide

This document explains how the HRMS system handles users with multiple roles during login and throughout their session.

## Overview

The system now supports users with multiple roles. When a user logs in with multiple roles, they can:
1. Select which role to use for the current session
2. Switch roles during their session without logging out
3. Access features based on their currently selected role

## Architecture

### Components

1. **RoleSelection Component** (`src/components/RoleSelection.tsx`)
   - Displayed after successful login if user has multiple roles
   - Shows all available roles in a user-friendly card interface
   - Allows user to select which role to use for the session

2. **RoleSwitcher Component** (`src/components/RoleSwitcher.tsx`)
   - Displayed in dashboard headers for users with multiple roles
   - Allows users to switch roles during their session
   - Automatically redirects to the appropriate dashboard for the selected role

### Utilities

3. **userRoles Library** (`src/lib/userRoles.ts`)
   - `getUserRoles()` - Get all roles for a user
   - `getSelectedRole()` - Get the currently selected role from session storage
   - `setSelectedRole()` - Store selected role in session storage
   - `getActiveRole()` - Get the active role (selected or first/highest priority)
   - `userHasRole()` - Check if user has a specific role
   - `userHasAnyRole()` - Check if user has any of the specified roles
   - `getDashboardPath()` - Get dashboard path for a role

4. **Updated getUserRoleFlexible** (`src/lib/getUserRoleFlexible.ts`)
   - Now checks session storage for selected role first
   - Falls back to database if no selection exists
   - Maintains backward compatibility

### API Endpoints

5. **User Roles API** (`src/app/api/user/roles/route.ts`)
   - `GET /api/user/roles` - Get all roles for authenticated user
   - `POST /api/user/roles` - Set selected role (validates user has the role)

### Updated Files

6. **Sign-In Page** (`src/app/sign-in/[[...sign-in]]/page.tsx`)
   - Detects multiple roles after successful authentication
   - Shows RoleSelection component if user has multiple roles
   - Handles role selection and redirects appropriately

7. **Middleware** (`src/middleware.ts`)
   - Updated to handle role selection
   - Uses highest priority role if no selection exists
   - Redirects based on active role

8. **Dashboard Layouts**
   - Admin dashboard (`src/app/dashboard/admin/layout.tsx`)
   - Faculty dashboard (`src/app/dashboard/faculty/layout.tsx`)
   - Both include RoleSwitcher component in header

## How It Works

### Login Flow

1. **User logs in** with email and password
2. **System authenticates** via Clerk
3. **System fetches** all roles for the user from database
4. **If single role**: User is redirected directly to their dashboard
5. **If multiple roles**: 
   - RoleSelection component is displayed
   - User selects desired role
   - Selected role is stored in sessionStorage
   - User is redirected to appropriate dashboard

### Role Selection

- Selected role is stored in `sessionStorage` as `selectedRole`
- This persists during the browser session
- Cleared when user logs out or closes browser
- Can be changed at any time via RoleSwitcher

### Role Switching

- RoleSwitcher appears in dashboard header for users with multiple roles
- Clicking the switcher shows dropdown with all available roles
- Selecting a new role:
  1. Updates sessionStorage
  2. Redirects to appropriate dashboard for that role
  3. All subsequent role checks use the new role

### Role Priority

When no role is selected (e.g., in middleware or server-side), the system uses role priority:
- Super Admin: 100
- Admin: 90
- Registrar: 80
- Cashier: 70
- Faculty: 60
- Other: 50

The highest priority role is used automatically.

### Access Control

The system checks roles in the following order:
1. Selected role from sessionStorage (client-side only)
2. Clerk metadata (backward compatibility)
3. Database (first/highest priority role)

For authorization checks, use:
- `getActiveRole()` - Get the active role for a user
- `userHasRole(role)` - Check if user has a specific role
- `userHasAnyRole(roles[])` - Check if user has any of the roles
- `userHasAllRoles(roles[])` - Check if user has all the roles

## Usage Examples

### Checking User Role in Components

```typescript
import { getActiveRole, userHasRole } from '@/lib/userRoles';
import { useUser } from '@clerk/nextjs';

const MyComponent = () => {
  const { user } = useUser();
  
  useEffect(() => {
    const checkRole = async () => {
      if (user?.primaryEmailAddress?.emailAddress) {
        const activeRole = await getActiveRole(undefined, user.primaryEmailAddress.emailAddress);
        const isAdmin = await userHasRole('admin', undefined, user.primaryEmailAddress.emailAddress);
        
        console.log('Active role:', activeRole);
        console.log('Is admin:', isAdmin);
      }
    };
    
    checkRole();
  }, [user]);
};
```

### Checking Role in API Routes

```typescript
import { getUserRoles, userHasAnyRole } from '@/lib/userRoles';

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  
  // Get all roles
  const roles = await getUserRoles(userId);
  
  // Check if user has admin access
  const hasAdminAccess = await userHasAnyRole(['admin', 'super admin'], userId);
  
  if (!hasAdminAccess) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  // ... rest of handler
}
```

## Database Schema

Users and roles are stored in the database with a many-to-many relationship:

- `User` table - Contains user information
- `Role` table - Contains role definitions
- `UserRole` table - Junction table linking users to roles

```sql
-- Example: User with multiple roles
User: { UserID: "123", Email: "user@example.com" }
UserRole: [
  { userId: "123", roleId: 1 },  -- Admin
  { userId: "123", roleId: 2 }   -- Faculty
]
```

## Security Considerations

1. **Role Validation**: When setting a selected role, the system validates that the user actually has that role
2. **Session Storage**: Selected role is stored client-side only; server-side always checks database
3. **Authorization**: All API routes should verify roles against the database, not just session storage
4. **Role Changes**: If a user's roles change (removed role), they'll be redirected to a valid role on next page load

## Migration Notes

- Existing single-role users: No changes needed, system works as before
- Existing multi-role users: Will see role selection on next login
- Backward compatibility: System still works with Clerk metadata and database checks
- All existing role checking code continues to work

## Future Enhancements

Possible improvements:
1. Store selected role in database for persistence across sessions
2. Role-based permissions system with fine-grained access control
3. Remember last used role per user
4. Role-specific dashboards with custom layouts
5. Role switching without page reload



