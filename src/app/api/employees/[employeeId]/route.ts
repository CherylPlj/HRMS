import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { currentUser } from '@clerk/nextjs/server';

export async function GET(
  request: Request,
  context: { params: Promise<{ employeeId: string }> }
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
  context: { params: Promise<{ employeeId: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employeeId } = await context.params;
    const data = await request.json();

    // Update employee in Supabase Employee table (only basic fields)
    const { data: updatedEmployee, error: employeeError } = await supabaseAdmin
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
        DepartmentID: data.DepartmentID || null,
        ContractID: data.ContractID || null,
        updatedAt: new Date().toISOString()
      })
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

    // Get employee data to check if exists and get UserID
    const { data: employee, error: fetchError } = await supabaseAdmin
      .from('Employee')
      .select('UserID, FirstName, LastName')
      .eq('EmployeeID', employeeId)
      .single();

    if (fetchError || !employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    try {
      // Delete related records first (in correct order due to foreign key constraints)
      
      // Delete GovernmentID record
      const { error: govIdDeleteError } = await supabaseAdmin
        .from('GovernmentID')
        .delete()
        .eq('employeeId', employeeId);

      if (govIdDeleteError) {
        console.log('GovernmentID delete info:', govIdDeleteError.message);
      }

      // Delete ContactInfo record
      const { error: contactDeleteError } = await supabaseAdmin
        .from('ContactInfo')
        .delete()
        .eq('employeeId', employeeId);

      if (contactDeleteError) {
        console.log('ContactInfo delete info:', contactDeleteError.message);
      }

      // Delete EmploymentDetail record
      const { error: employmentDeleteError } = await supabaseAdmin
        .from('EmploymentDetail')
        .delete()
        .eq('employeeId', employeeId);

      if (employmentDeleteError) {
        console.log('EmploymentDetail delete info:', employmentDeleteError.message);
      }

      // Finally delete the Employee record
      const { error: employeeDeleteError } = await supabaseAdmin
        .from('Employee')
        .delete()
        .eq('EmployeeID', employeeId);

      if (employeeDeleteError) {
        throw new Error(`Failed to delete employee: ${employeeDeleteError.message}`);
      }

      // If employee has an associated user account, delete that too
      if (employee.UserID) {
        try {
          const deleteResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/deleteUser`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: employee.UserID,
              createdBy: user.id
            }),
          });

          const deleteResult = await deleteResponse.json();

          if (!deleteResponse.ok) {
            console.log('User account deletion failed, but employee record deleted:', deleteResult.error);
            return NextResponse.json({ 
              message: 'Employee record deleted successfully, but user account deletion failed',
              clerkDeleted: false,
              warning: deleteResult.error
            });
          }

          return NextResponse.json({ 
            message: 'Employee and associated account deleted successfully',
            clerkDeleted: deleteResult.clerkDeleted
          });
        } catch (userDeleteError) {
          console.log('User deletion error:', userDeleteError);
          return NextResponse.json({ 
            message: 'Employee record deleted successfully, but user account deletion failed',
            clerkDeleted: false,
            warning: 'Could not delete associated user account'
          });
        }
      } else {
        return NextResponse.json({ 
          message: 'Employee record deleted successfully',
          clerkDeleted: false
        });
      }
    } catch (deleteError) {
      console.error('Error during deletion process:', deleteError);
      throw deleteError;
    }
  } catch (error) {
    console.error('Error deleting employee:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete employee' },
      { status: 500 }
    );
  }
}

 