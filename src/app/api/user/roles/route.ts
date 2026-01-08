import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/user/roles
 * Get all roles for the current authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Query user by ClerkID (userId from Clerk auth is the Clerk ID)
    const { data: userData, error: userError } = await supabase
      .from('User')
      .select(`
        UserID,
        Email,
        UserRole (
          role:Role (
            id,
            name
          )
        )
      `)
      .eq('ClerkID', userId)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const roles = ((userData as any).UserRole || []).map((ur: any) => ({
      id: ur.role.id,
      name: ur.role.name
    }));

    return NextResponse.json({
      roles,
      userId: userData.UserID,
      email: userData.Email
    });
  } catch (error) {
    console.error('Error fetching user roles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/roles
 * Set the selected role for the current session
 * Body: { role: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { role } = await request.json();

    if (!role || typeof role !== 'string') {
      return NextResponse.json(
        { error: 'Role is required' },
        { status: 400 }
      );
    }

    // Verify user has this role
    const { data: userData, error: userError } = await supabase
      .from('User')
      .select(`
        UserID,
        UserRole (
          role:Role (
            name
          )
        )
      `)
      .eq('ClerkID', userId)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userRoles = ((userData as any).UserRole || []).map((ur: any) => 
      ur.role.name.toLowerCase()
    );

    if (!userRoles.includes(role.toLowerCase())) {
      return NextResponse.json(
        { error: 'User does not have this role' },
        { status: 403 }
      );
    }

    // Return success - the client will store in sessionStorage
    return NextResponse.json({
      success: true,
      role: role.toLowerCase(),
      message: 'Role selected successfully'
    });
  } catch (error) {
    console.error('Error setting user role:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



