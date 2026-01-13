import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { currentUser } from '@clerk/nextjs/server';

// PATCH: Update a leave type
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { LeaveTypeName, NumberOfDays } = body;

    if (!LeaveTypeName) {
      return NextResponse.json({ error: 'Leave type name is required' }, { status: 400 });
    }

    const updateData: any = { LeaveTypeName };
    if (NumberOfDays !== undefined) {
      updateData.NumberOfDays = NumberOfDays;
    }

    const { data, error } = await supabaseAdmin
      .from('LeaveTypes')
      .update(updateData)
      .eq('LeaveTypeID', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase PATCH error:', error);
      
      // Handle unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Leave type name already exists' },
          { status: 400 }
        );
      }
      
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Leave type not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating leave type:', error);
    return NextResponse.json(
      { error: 'Failed to update leave type' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a leave type
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // First, check if the leave type exists
    const { data: leaveType, error: fetchError } = await supabaseAdmin
      .from('LeaveTypes')
      .select('LeaveTypeID, LeaveTypeName')
      .eq('LeaveTypeID', id)
      .single();

    if (fetchError || !leaveType) {
      return NextResponse.json(
        { error: 'Leave type not found' },
        { status: 404 }
      );
    }

    // Check if any leaves reference this leave type by name
    // Note: In Prisma schema, Leave.LeaveType is an enum, not a foreign key
    // So we check by LeaveTypeName (enum value) instead of LeaveTypeID
    const { data: referencingLeaves, error: refError } = await supabaseAdmin
      .from('Leave')
      .select('LeaveID')
      .eq('LeaveType', leaveType.LeaveTypeName)
      .limit(1);

    if (refError) {
      console.error('Error checking referencing leaves:', refError);
      // If the error is because LeaveType is an enum, we'll still allow deletion
      // but log the error
      console.warn('Could not check leave references, proceeding with deletion');
    }

    if (referencingLeaves && referencingLeaves.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete: There are leave requests referencing this leave type.' },
        { status: 400 }
      );
    }

    // Proceed with delete if no references
    const { error } = await supabaseAdmin
      .from('LeaveTypes')
      .delete()
      .eq('LeaveTypeID', id);

    if (error) {
      console.error('Error deleting leave type:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting leave type:', error);
    return NextResponse.json(
      { error: 'Failed to delete leave type' },
      { status: 500 }
    );
  }
}

