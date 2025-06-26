import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { currentUser } from '@clerk/nextjs/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(
  request: Request,
  context: { params: { employeeId: string } }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const employeeId = params.employeeId;

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    // Get employee data from Supabase
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

export async function PATCH(
  request: Request,
  context: { params: { employeeId: string } }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { params } = context;
    const employeeId = params.employeeId;
    const data = await request.json();

    // Update employee in Supabase
    const { data: updatedEmployee, error } = await supabaseAdmin
      .from('Employee')
      .update({
        LastName: data.LastName,
        FirstName: data.FirstName,
        MiddleName: data.MiddleName || null,
        ExtensionName: data.ExtensionName || null,
        Sex: data.Sex,
        Photo: data.Photo || null,
        DateOfBirth: data.DateOfBirth,
        PlaceOfBirth: data.PlaceOfBirth || null,
        CivilStatus: data.CivilStatus || null,
        Nationality: data.Nationality || null,
        Religion: data.Religion || null,
        BloodType: data.BloodType || null,
        Email: data.Email || null,
        Phone: data.Phone || null,
        Address: data.Address || null,
        PresentAddress: data.PresentAddress || null,
        PermanentAddress: data.PermanentAddress || null,
        
        // Government IDs
        SSSNumber: data.SSSNumber || null,
        TINNumber: data.TINNumber || null,
        PhilHealthNumber: data.PhilHealthNumber || null,
        PagIbigNumber: data.PagIbigNumber || null,
        GSISNumber: data.GSISNumber || null,
        PRCLicenseNumber: data.PRCLicenseNumber || null,
        PRCValidity: data.PRCValidity || null,

        EmploymentStatus: data.EmploymentStatus || 'Regular',
        HireDate: data.HireDate,
        ResignationDate: data.ResignationDate || null,
        Designation: data.Designation || null,
        Position: data.Position || null,
        DepartmentID: data.DepartmentID || null,
        ContractID: data.ContractID || null,
        EmergencyContactName: data.EmergencyContactName || null,
        EmergencyContactNumber: data.EmergencyContactNumber || null,
        EmployeeType: data.EmployeeType || 'Regular',
        SalaryGrade: data.SalaryGrade || null,
        
        updatedAt: new Date().toISOString()
      })
      .eq('EmployeeID', employeeId)
      .select()
      .single();

    if (error) {
      console.error('Error updating employee:', error);
      throw error;
    }

    return NextResponse.json(updatedEmployee);
  } catch (error) {
    console.error('Error updating employee:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update employee' },
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
    const employeeId = params.employeeId;

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

export async function PUT(request: Request, { params }: { params: { employeeId: string } }) {
  try {
    const employeeId = params.employeeId;
    const updateData = await request.json();
    
    const supabase = createRouteHandlerClient({ cookies });

    // Update the Employee table
    const { data, error: employeeError } = await supabase
      .from('Employee')
      .update({
        LastName: updateData.LastName,
        FirstName: updateData.FirstName,
        MiddleName: updateData.MiddleName,
        ExtensionName: updateData.ExtensionName,
        Sex: updateData.Sex,
        Photo: updateData.Photo,
        DateOfBirth: updateData.DateOfBirth,
        PlaceOfBirth: updateData.PlaceOfBirth,
        CivilStatus: updateData.CivilStatus,
        Nationality: updateData.Nationality,
        Religion: updateData.Religion,
        BloodType: updateData.BloodType,
        Email: updateData.Email,
        Phone: updateData.Phone,
        Address: updateData.Address,
        PresentAddress: updateData.PresentAddress,
        PermanentAddress: updateData.PermanentAddress,
        SSSNumber: updateData.SSSNumber,
        TINNumber: updateData.TINNumber,
        PhilHealthNumber: updateData.PhilHealthNumber,
        PagIbigNumber: updateData.PagIbigNumber,
        GSISNumber: updateData.GSISNumber,
        PRCLicenseNumber: updateData.PRCLicenseNumber,
        PRCValidity: updateData.PRCValidity,
        EmploymentStatus: updateData.EmploymentStatus,
        HireDate: updateData.HireDate,
        ResignationDate: updateData.ResignationDate,
        Designation: updateData.Designation,
        Position: updateData.Position,
        DepartmentID: updateData.DepartmentID,
        ContractID: updateData.ContractID,
        EmergencyContactName: updateData.EmergencyContactName,
        EmergencyContactNumber: updateData.EmergencyContactNumber,
        EmployeeType: updateData.EmployeeType,
        SalaryGrade: updateData.SalaryGrade,
        updatedAt: new Date().toISOString()
      })
      .eq('EmployeeID', employeeId)
      .select('*, Department(DepartmentName)')
      .single();

    if (employeeError) {
      throw new Error(`Failed to update employee: ${employeeError.message}`);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating employee:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred while updating employee' },
      { status: 500 }
    );
  }
} 