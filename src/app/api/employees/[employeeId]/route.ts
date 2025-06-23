import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { currentUser } from '@clerk/nextjs/server';

export async function GET(
  request: Request,
  context: { params: { employeeId: string } }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { params } = context;
    const employeeId = parseInt((await params).employeeId);

    // First get employee data from Supabase
    const { data: employee, error } = await supabaseAdmin
      .from('Employee')
      .select(`
        *,
        User:UserID (
          UserID,
          FirstName,
          LastName,
          Email,
          Status,
          Photo
        ),
        Department:DepartmentID (
          DepartmentID,
          DepartmentName
        )
      `)
      .eq('EmployeeID', employeeId)
      .single();

    if (error || !employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(employee);
  } catch (error) {
    console.error('Error fetching employee:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employee details' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  context: { params: { employeeId: string } }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { params } = context;
    const employeeId = parseInt((await params).employeeId);
    const data = await request.json();

    // Update employee in Supabase
    const { data: updatedEmployee, error } = await supabaseAdmin
      .from('Employee')
      .update({
        Position: data.Position,
        DepartmentID: data.DepartmentId,
        EmploymentStatus: data.EmploymentStatus,
        EmployeeType: data.EmployeeType,
        ResignationDate: data.ResignationDate,
        Phone: data.Phone,
        Address: data.Address,
        HireDate: data.HireDate,
        DateOfBirth: data.DateOfBirth,
        EmergencyContact: data.EmergencyContact,
        EmergencyRelation: data.EmergencyRelation,
        EmergencyPhone: data.EmergencyPhone,
        // Add other CSC Form 212 fields
        PlaceOfBirth: data.PlaceOfBirth,
        Gender: data.Gender,
        CivilStatus: data.CivilStatus,
        Height: data.Height,
        Weight: data.Weight,
        BloodType: data.BloodType,
        GSIS: data.GSIS,
        SSS: data.SSS,
        PhilHealth: data.PhilHealth,
        PagIbig: data.PagIbig,
        TIN: data.TIN,
        MobilePhone: data.MobilePhone,
        Education: data.Education,
        CivilService: data.CivilService,
        WorkExperience: data.WorkExperience
      })
      .eq('EmployeeID', employeeId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(updatedEmployee);
  } catch (error) {
    console.error('Error updating employee:', error);
    return NextResponse.json(
      { error: 'Failed to update employee' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: { employeeId: string } }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { params } = context;
    const employeeId = parseInt((await params).employeeId);

    // Get employee data to check if exists and get UserID
    const { data: employee, error: fetchError } = await supabaseAdmin
      .from('Employee')
      .select('UserID')
      .eq('EmployeeID', employeeId)
      .single();

    if (fetchError || !employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Soft delete the user in Supabase
    const { error: updateError } = await supabaseAdmin
      .from('User')
      .update({ isDeleted: true })
      .eq('UserID', employee.UserID);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Error deleting employee:', error);
    return NextResponse.json(
      { error: 'Failed to delete employee' },
      { status: 500 }
    );
  }
} 