import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { currentUser } from '@clerk/nextjs/server';

export async function PUT(
  request: Request,
  context: { params: Promise<{ facultyId: string }> }
) {
  try {
    const { params } = context;
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const facultyId = parseInt((await params).facultyId);
    const data = await request.json();

    // Get the current faculty data for comparison
    const { data: currentFaculty, error: fetchError } = await supabaseAdmin
      .from('Faculty')
      .select(`
        *,
        User:UserID (
          UserID,
          FirstName,
          LastName,
          Email,
          Status
        )
      `)
      .eq('FacultyID', facultyId)
      .single();

    if (fetchError || !currentFaculty) {
      return NextResponse.json({ error: 'Faculty not found' }, { status: 404 });
    }

    // Update faculty record
    const { data: updatedFaculty, error: updateError } = await supabaseAdmin
      .from('Faculty')
      .update({
        Position: data.Position,
        DepartmentID: data.DepartmentID,
        EmploymentStatus: data.EmploymentStatus,
        ResignationDate: data.EmploymentStatus === 'Resigned' ? data.Resignation_Date : null,
        Phone: data.Phone,
        Address: data.Address,
      })
      .eq('FacultyID', facultyId)
      .select(`
        *,
        User:UserID (
          UserID,
          FirstName,
          LastName,
          Email,
          Status
        ),
        Department:DepartmentID (
          DepartmentID,
          DepartmentName
        )
      `)
      .single();

    if (updateError) {
      console.error('Error updating faculty:', updateError);
      return NextResponse.json(
        { error: 'Failed to update faculty: ' + updateError.message },
        { status: 500 }
      );
    }

    // Create activity log for the update
    const { error: logError } = await supabaseAdmin
      .from('ActivityLog')
      .insert({
        UserID: user.id,
        ActionType: 'UPDATE',
        EntityAffected: 'Faculty',
        RecordID: facultyId,
        ActionDetails: JSON.stringify({
          previous: {
            Position: currentFaculty.Position,
            DepartmentID: currentFaculty.DepartmentID,
            EmploymentStatus: currentFaculty.EmploymentStatus,
            ResignationDate: currentFaculty.ResignationDate,
            Phone: currentFaculty.Phone,
            Address: currentFaculty.Address,
          },
          new: {
            Position: data.Position,
            DepartmentID: data.DepartmentID,
            EmploymentStatus: data.EmploymentStatus,
            ResignationDate: data.EmploymentStatus === 'Resigned' ? data.Resignation_Date : null,
            Phone: data.Phone,
            Address: data.Address,
          },
        }),
        IPAddress: request.headers.get('x-forwarded-for') || 'Unknown',
      });

    if (logError) {
      console.error('Error creating activity log:', logError);
    }

    // If employment status changed to Resigned, update user status
    if (data.EmploymentStatus === 'Resigned' && currentFaculty.EmploymentStatus !== 'Resigned') {
      const { error: userUpdateError } = await supabaseAdmin
        .from('User')
        .update({ Status: 'Inactive' })
        .eq('UserID', currentFaculty.UserID);

      if (userUpdateError) {
        console.error('Error updating user status:', userUpdateError);
      }
    }

    return NextResponse.json(updatedFaculty);
  } catch (error) {
    console.error('Error updating faculty:', error);
    return NextResponse.json(
      { error: 'Failed to update faculty' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ facultyId: string }> }
) {
  try {
      const { params } = context;

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const facultyId = parseInt((await params).facultyId);

    // First get the faculty to get the UserID
    const { data: faculty, error: fetchError } = await supabaseAdmin
      .from('Faculty')
      .select('UserID')
      .eq('FacultyID', facultyId)
      .single();

    if (fetchError || !faculty) {
      return NextResponse.json(
        { error: 'Faculty not found' },
        { status: 404 }
      );
    }

    // Soft delete the user
    const { error: updateError } = await supabaseAdmin
      .from('User')
      .update({ isDeleted: true })
      .eq('UserID', faculty.UserID);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to delete faculty' },
        { status: 500 }
      );
    }

    // Create activity log for the deletion
    const { error: logError } = await supabaseAdmin
      .from('ActivityLog')
      .insert({
        UserID: user.id,
        ActionType: 'DELETE',
        EntityAffected: 'Faculty',
        RecordID: facultyId,
        ActionDetails: 'Faculty member soft deleted',
        IPAddress: request.headers.get('x-forwarded-for') || 'Unknown',
      });

    if (logError) {
      console.error('Error creating activity log:', logError);
    }

    return NextResponse.json({ message: 'Faculty deleted successfully' });
  } catch (error) {
    console.error('Error deleting faculty:', error);
    return NextResponse.json(
      { error: 'Failed to delete faculty' },
      { status: 500 }
    );
  }
} 