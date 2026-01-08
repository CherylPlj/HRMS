import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// PATCH - Update a role
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const roleId = parseInt(id, 10);

    if (isNaN(roleId)) {
      return NextResponse.json(
        { error: 'Invalid role ID' },
        { status: 400 }
      );
    }

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

    // Check if role exists
    const { data: existingRole, error: fetchError } = await supabase
      .from('Role')
      .select('id, name')
      .eq('id', roleId)
      .single();

    if (fetchError || !existingRole) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    // Check if another role with the same name exists (case-insensitive)
    const { data: allRoles, error: checkError } = await supabase
      .from('Role')
      .select('id, name');

    if (checkError) {
      console.error('Error checking duplicate role:', checkError);
      return NextResponse.json(
        { error: 'Failed to check duplicate role', details: checkError.message },
        { status: 500 }
      );
    }

    // Check for case-insensitive duplicate
    const duplicateRole = allRoles?.find(
      r => r.id !== roleId && r.name.toLowerCase() === roleName.toLowerCase()
    );

    if (duplicateRole) {
      return NextResponse.json(
        { error: 'Role with this name already exists' },
        { status: 400 }
      );
    }

    // Update the role
    const { data: updatedRole, error: updateError } = await supabase
      .from('Role')
      .update({ name: roleName })
      .eq('id', roleId)
      .select('id, name')
      .single();

    if (updateError) {
      console.error('Error updating role:', updateError);
      return NextResponse.json(
        { error: 'Failed to update role', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedRole);
  } catch (error) {
    console.error('Error in PATCH /api/roles/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a role
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const roleId = parseInt(id, 10);

    if (isNaN(roleId)) {
      return NextResponse.json(
        { error: 'Invalid role ID' },
        { status: 400 }
      );
    }

    // Check if role exists
    const { data: existingRole, error: fetchError } = await supabase
      .from('Role')
      .select('id, name')
      .eq('id', roleId)
      .single();

    if (fetchError || !existingRole) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    // Check if role is being used by any users
    const { data: userRoles, error: userRoleError } = await supabase
      .from('UserRole')
      .select('userId')
      .eq('roleId', roleId)
      .limit(1);

    if (userRoleError) {
      console.error('Error checking user roles:', userRoleError);
      return NextResponse.json(
        { error: 'Failed to check role usage', details: userRoleError.message },
        { status: 500 }
      );
    }

    if (userRoles && userRoles.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete role: it is assigned to one or more users' },
        { status: 400 }
      );
    }

    // Delete the role
    const { error: deleteError } = await supabase
      .from('Role')
      .delete()
      .eq('id', roleId);

    if (deleteError) {
      console.error('Error deleting role:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete role', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/roles/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

