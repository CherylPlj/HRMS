import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { currentUser } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { getUserRoleFlexible } from '@/lib/getUserRoleFlexible';

export async function GET(
  request: Request,
  context: { params: Promise<{ employeeId: string }> }
) {
  try {
    // Check authentication
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employeeId } = await context.params;
    console.log('Fetching employee with ID:', employeeId);

    // Start with basic employee data only
    const { data: employee, error } = await supabaseAdmin
      .from('Employee')
      .select('*')
      .eq('EmployeeID', employeeId)
      .single();

    if (error) {
      console.error('Employee fetch error:', error);
      return NextResponse.json(
        { error: 'Database error: ' + error.message },
        { status: 500 }
      );
    }

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Fetch related data separately to avoid complex joins
    let employmentDetail = null;
    let contactInfo = null;
    let governmentId = null;
    let department = null;

    try {
      // Employment detail
      const { data: empDetail } = await supabaseAdmin
        .from('EmploymentDetail')
        .select('*')
        .eq('employeeId', employeeId)
        .single();
      employmentDetail = empDetail;
    } catch (e) {
      console.log('No employment detail found');
    }

    try {
      // Contact info
      const { data: contact } = await supabaseAdmin
        .from('ContactInfo')
        .select('*')
        .eq('employeeId', employeeId)
        .single();
      contactInfo = contact;
    } catch (e) {
      console.log('No contact info found');
    }

    try {
      // Government ID
      const { data: govId } = await supabaseAdmin
        .from('GovernmentID')
        .select('*')
        .eq('employeeId', employeeId)
        .single();
      governmentId = govId;
    } catch (e) {
      console.log('No government ID found');
    }

    try {
      // Department
      if (employee.DepartmentID) {
        const { data: dept } = await supabaseAdmin
          .from('Department')
          .select('DepartmentName, type')
          .eq('DepartmentID', employee.DepartmentID)
          .single();
        department = dept;
      }
    } catch (e) {
      console.log('No department found');
    }

    // Combine all data
    const result = {
      ...employee,
      EmploymentDetail: employmentDetail,
      ContactInfo: contactInfo,
      GovernmentID: governmentId,
      Department: department
    };

    console.log('Successfully fetched employee data');
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching employee data:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ employeeId: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employeeId } = await context.params;
    const data = await request.json();

    // If only UserID is being updated, handle it separately
    if (Object.keys(data).length === 1 && data.UserID !== undefined) {
      const { data: updatedEmployee, error: employeeError } = await supabaseAdmin
        .from('Employee')
        .update({
          UserID: data.UserID,
          updatedAt: new Date().toISOString()
        })
        .eq('EmployeeID', employeeId)
        .select()
        .single();

      if (employeeError) {
        console.error('Error updating employee UserID:', employeeError);
        throw employeeError;
      }

      return NextResponse.json(updatedEmployee);
    }

    // Update employee in Supabase Employee table (only basic fields)
    const updateFields: any = {
      updatedAt: new Date().toISOString()
    };

    // Only include fields that are provided in the request
    if (data.UserID !== undefined) updateFields.UserID = data.UserID;
    if (data.LastName !== undefined) updateFields.LastName = data.LastName;
    if (data.FirstName !== undefined) updateFields.FirstName = data.FirstName;
    if (data.MiddleName !== undefined) updateFields.MiddleName = data.MiddleName || null;
    if (data.ExtensionName !== undefined) updateFields.ExtensionName = data.ExtensionName || null;
    if (data.Sex !== undefined) updateFields.Sex = data.Sex;
    if (data.Photo !== undefined) updateFields.Photo = data.Photo || null;
    if (data.DateOfBirth !== undefined) updateFields.DateOfBirth = data.DateOfBirth;
    if (data.PlaceOfBirth !== undefined) updateFields.PlaceOfBirth = data.PlaceOfBirth || null;
    if (data.CivilStatus !== undefined) updateFields.CivilStatus = data.CivilStatus || null;
    if (data.Nationality !== undefined) updateFields.Nationality = data.Nationality || null;
    if (data.Religion !== undefined) updateFields.Religion = data.Religion || null;
    if (data.BloodType !== undefined) updateFields.BloodType = data.BloodType || null;
    if (data.DepartmentID !== undefined) updateFields.DepartmentID = data.DepartmentID || null;
    if (data.ContractID !== undefined) updateFields.ContractID = data.ContractID || null;

    const { data: updatedEmployee, error: employeeError } = await supabaseAdmin
      .from('Employee')
      .update(updateFields)
      .eq('EmployeeID', employeeId)
      .select()
      .single();

    if (employeeError) {
      console.error('Error updating employee:', employeeError);
      throw employeeError;
    }

    // Update or create EmploymentDetail record
    if (data.HireDate !== undefined || data.EmploymentStatus !== undefined || data.Designation !== undefined || data.Position !== undefined || data.SalaryGrade !== undefined) {
      const { error: employmentError } = await supabaseAdmin
        .from('EmploymentDetail')
        .upsert({
          employeeId: employeeId,
          EmploymentStatus: data.EmploymentStatus || 'Regular',
          HireDate: data.HireDate,
          ResignationDate: data.ResignationDate || null,
          Designation: data.Designation || null,
          Position: data.Position || null,
          SalaryGrade: data.SalaryGrade || null,
          updatedAt: new Date().toISOString()
        }, {
          onConflict: 'employeeId'
        });

      if (employmentError) {
        console.error('Error updating employment detail:', employmentError);
        throw employmentError;
      }
    }

    // Update or create ContactInfo record
    if (data.Email !== undefined || data.Phone !== undefined || data.PresentAddress !== undefined || data.PermanentAddress !== undefined || data.EmergencyContactName !== undefined || data.EmergencyContactNumber !== undefined) {
      const { error: contactError } = await supabaseAdmin
        .from('ContactInfo')
        .upsert({
          employeeId: employeeId,
          Email: data.Email || null,
          Phone: data.Phone || null,
          PresentAddress: data.PresentAddress || null,
          PermanentAddress: data.PermanentAddress || null,
          EmergencyContactName: data.EmergencyContactName || null,
          EmergencyContactNumber: data.EmergencyContactNumber || null,
          updatedAt: new Date().toISOString()
        }, {
          onConflict: 'employeeId'
        });

      if (contactError) {
        console.error('Error updating contact info:', contactError);
        throw contactError;
      }
    }

    // Update or create GovernmentID record
    if (data.SSSNumber !== undefined || data.TINNumber !== undefined || data.PhilHealthNumber !== undefined || data.PagIbigNumber !== undefined || data.GSISNumber !== undefined || data.PRCLicenseNumber !== undefined || data.PRCValidity !== undefined) {
      const { error: govIdError } = await supabaseAdmin
        .from('GovernmentID')
        .upsert({
          employeeId: employeeId,
          SSSNumber: data.SSSNumber || null,
          TINNumber: data.TINNumber || null,
          PhilHealthNumber: data.PhilHealthNumber || null,
          PagIbigNumber: data.PagIbigNumber || null,
          GSISNumber: data.GSISNumber || null,
          PRCLicenseNumber: data.PRCLicenseNumber || null,
          PRCValidity: data.PRCValidity || null,
          updatedAt: new Date().toISOString()
        }, {
          onConflict: 'employeeId'
        });

      if (govIdError) {
        console.error('Error updating government ID:', govIdError);
        throw govIdError;
      }
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
  context: { params: Promise<{ employeeId: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employeeId } = await context.params;

    // Get employee data first to check if it exists and get associated User data
    const { data: employee, error: fetchError } = await supabaseAdmin
      .from('Employee')
      .select(`
        *,
        User:UserID (
          UserID,
          ClerkID
        )
      `)
      .eq('EmployeeID', employeeId)
      .single();

    if (fetchError || !employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // If there's an associated user, delete from Clerk first
    if (employee.User?.ClerkID) {
      try {
        const clerk = await clerkClient();
        await clerk.users.deleteUser(employee.User.ClerkID);
        console.log(`Successfully deleted Clerk user: ${employee.User.ClerkID}`);
      } catch (clerkError) {
        console.error('Error deleting Clerk user:', clerkError);
        // Continue with deletion even if Clerk deletion fails
      }
    }

    // Delete from Supabase
    const { error: deleteError } = await supabaseAdmin
      .from('Employee')
      .delete()
      .eq('EmployeeID', employeeId);

    if (deleteError) {
      throw deleteError;
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

 