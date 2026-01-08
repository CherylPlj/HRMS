import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Fetch all roles
export async function GET() {
  try {
    const { data: roles, error } = await supabase
      .from('Role')
      .select('id, name')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching roles:', error);
      return NextResponse.json(
        { error: 'Failed to fetch roles', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(roles || []);
  } catch (error) {
    console.error('Error in GET /api/roles:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST - Create a new role
export async function POST(request: Request) {
  try {
    const { name } = await request.json();

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Role name is required' },
        { status: 400 }
      );
    }

    // Validate role name format
    const roleName = name.trim();
    if (roleName.length < 2) {
      return NextResponse.json(
        { error: 'Role name must be at least 2 characters long' },
        { status: 400 }
      );
    }

    if (roleName.length > 50) {
      return NextResponse.json(
        { error: 'Role name must not exceed 50 characters' },
        { status: 400 }
      );
    }

    // Check if role already exists
    const { data: existingRole, error: checkError } = await supabase
      .from('Role')
      .select('id, name')
      .eq('name', roleName)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is expected for new roles
      console.error('Error checking existing role:', checkError);
      return NextResponse.json(
        { error: 'Failed to check existing role', details: checkError.message },
        { status: 500 }
      );
    }

    if (existingRole) {
      return NextResponse.json(
        { error: 'Role with this name already exists' },
        { status: 400 }
      );
    }

    // Create the role
    const { data: newRole, error: insertError } = await supabase
      .from('Role')
      .insert({ name: roleName })
      .select('id, name')
      .single();

    if (insertError) {
      console.error('Error creating role:', insertError);
      return NextResponse.json(
        { error: 'Failed to create role', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(newRole, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/roles:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

