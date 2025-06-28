import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { currentUser } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { getUserRoleFlexible } from '@/lib/getUserRoleFlexible';

// Add helper function to log activities
async function logActivity(
  userId: string,
  actionType: string,
  entityAffected: string,
  actionDetails: string,
  ipAddress: string = 'system'
) {
  try {
    await supabaseAdmin
      .from('ActivityLog')
      .insert([
        {
          UserID: userId,
          ActionType: actionType,
          EntityAffected: entityAffected,
          ActionDetails: actionDetails,
          Timestamp: new Date().toISOString(),
          IPAddress: ipAddress
        }
      ]);
    console.log('Activity logged successfully:', { actionType, userId });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

export async function GET(
  request: Request,
  { params }: { params: { employeeId: string } }
) {
  try {
    // Check authentication
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user role
    const userRole = await getUserRoleFlexible(user.id);
    if (!userRole || (!userRole.includes('ADMIN') && user.id !== params.employeeId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { employeeId } = params;

    // Fetch employee data with all related information
    const { data: employee, error } = await supabaseAdmin
      .from('Employee')
      .select(`
        *,
        EmploymentDetail(
          EmploymentStatus, 
          HireDate, 
          ResignationDate, 
          Designation, 
          Position, 
          SalaryGrade,
          EmployeeType
        ),
        ContactInfo(
          Email, 
          Phone, 
          PresentAddress, 
          PermanentAddress, 
          EmergencyContactName, 
          EmergencyContactNumber
        ),
        GovernmentID(
          SSSNumber, 
          TINNumber, 
          PhilHealthNumber, 
          PagIbigNumber, 
          GSISNumber, 
          PRCLicenseNumber, 
          PRCValidity,
          BIRNumber,
          PassportNumber,
          PassportValidity
        ),
        Department(
          DepartmentName,
          type
        ),
        Family(
          id, 
          type, 
          name, 
          dateOfBirth, 
          occupation, 
          isDependent, 
          relationship, 
          contactNumber, 
          address
        ),
        skills(
          id, 
          name, 
          proficiencyLevel, 
          yearsOfExperience, 
          description
        ),
        MedicalInfo(
          medicalNotes, 
          lastCheckup, 
          vaccination, 
          allergies, 
          hasDisability, 
          disabilityType, 
          disabilityDetails,
          accommodationsNeeded,
          pwdIdNumber,
          pwdIdValidity,
          bloodPressure,
          height,
          weight,
          emergencyProcedures,
          primaryPhysician,
          physicianContact,
          healthInsuranceProvider,
          healthInsuranceNumber,
          healthInsuranceExpiryDate
        ),
        Education(
          id, 
          level, 
          schoolName, 
          course, 
          yearGraduated, 
          honors
        ),
        EmploymentHistory(
          id, 
          schoolName, 
          position, 
          startDate, 
          endDate, 
          reasonForLeaving
        ),
        certificates(
          id, 
          title, 
          issuedBy, 
          issueDate, 
          expiryDate, 
          description, 
          fileUrl
        )
      `)
      .eq('EmployeeID', employeeId)
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch employee data' },
        { status: 500 }
      );
    }

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(employee);
  } catch (error) {
    console.error('Error fetching employee data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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
    console.log(`Attempting to delete employee with ID: ${employeeId}`);

    // Get employee data first to check if it exists and get associated User data
    const { data: employee, error: fetchError } = await supabaseAdmin
      .from('Employee')
      .select(`
        *,
        User (
        UserID, 
          ClerkID,
          FirstName,
          LastName,
          Email
        )
      `)
      .eq('EmployeeID', employeeId)
      .single();

    if (fetchError) {
      console.error('Error fetching employee:', fetchError);
      return NextResponse.json(
        { error: `Error fetching employee: ${fetchError.message}` },
        { status: 500 }
      );
    }

    if (!employee) {
      console.error(`Employee not found with ID: ${employeeId}`);
      return NextResponse.json(
        { error: `Employee not found with ID: ${employeeId}` },
        { status: 404 }
      );
    }

    let clerkDeleted = false;
    let clerkError = null;

    // If there's an associated user, delete from Clerk and database
    if (employee.User?.ClerkID && employee.User.ClerkID.trim() !== '') {
        try {
          // First verify if the Clerk user exists
        let clerkUser = null;
          try {
          const clerk = await clerkClient();
          clerkUser = await clerk.users.getUser(employee.User.ClerkID);
        } catch (getError: any) {
          // If error is not a "not found" error, it's a real error
          if (!getError.message?.includes('could not be found')) {
            throw getError;
          }
          console.warn(`Clerk user not found for ClerkID: ${employee.User.ClerkID}`);
        }

            if (clerkUser) {
          try {
            const clerk = await clerkClient();
            await clerk.users.deleteUser(employee.User.ClerkID);
              console.log(`Successfully deleted Clerk user: ${employee.User.ClerkID}`);
            clerkDeleted = true;
          } catch (deleteError: any) {
            // If we get a specific error about user not found, consider it a success
            if (deleteError.message?.includes('could not be found')) {
              console.log(`Clerk user ${employee.User.ClerkID} was already deleted`);
              clerkDeleted = true;
            } else {
              throw deleteError;
            }
          }
            }
      } catch (error: any) {
        console.error('Error deleting Clerk user:', error);
        clerkError = error.message || 'Unknown error deleting Clerk user';
        // Continue with database deletion even if Clerk deletion fails
        }

      // Delete the User record from the database
      const { error: userDeleteError } = await supabaseAdmin
        .from('User')
        .delete()
        .eq('UserID', employee.User.UserID);

      if (userDeleteError) {
        console.error('Error deleting user record:', userDeleteError);
        throw new Error(`Failed to delete user record: ${userDeleteError.message}`);
      }
    }

    // Instead of hard deleting, soft delete the employee and related records
    const { error: deleteError } = await supabaseAdmin
      .from('Employee')
      .update({
        isDeleted: true,
        DateModified: new Date().toISOString(),
        updatedBy: user.id
      })
      .eq('EmployeeID', employeeId);

    if (deleteError) {
      console.error('Error soft deleting employee record:', deleteError);
      throw new Error(`Failed to soft delete employee record: ${deleteError.message}`);
    }

    // Soft delete all related records
    const relatedTables = ['ContactInfo', 'GovernmentID', 'EmploymentDetail', 'Education', 'WorkExperience', 'Family', 'Certificate', 'Skill'];
    
    for (const table of relatedTables) {
      const { error: relatedError } = await supabaseAdmin
        .from(table)
        .update({
          isDeleted: true,
          DateModified: new Date().toISOString(),
          updatedBy: user.id
        })
        .eq('employeeId', employeeId);

      if (relatedError) {
        console.error(`Error soft deleting ${table}:`, relatedError);
      }
    }

    console.log(`Successfully soft deleted employee with ID: ${employeeId} and related records`);

    // Log the activity
    const activityDetails = [
      `Soft deleted employee: ${employee.FirstName} ${employee.LastName}`,
      employee.User ? `User account deleted (${employee.User.Email})` : 'No user account found',
      clerkDeleted ? 'Clerk account deleted' : `Clerk account deletion ${clerkError ? 'failed: ' + clerkError : 'not attempted'}`
    ].join(' - ');

    await logActivity(
      user.id,
      'employee_soft_deleted',
      'Employee',
      activityDetails,
      request.headers.get('x-forwarded-for') || 'system'
    );

    // If Clerk deletion failed but everything else succeeded, return a 207 status
    const status = clerkError ? 207 : 200;

    return NextResponse.json({ 
      message: clerkError 
        ? 'Employee soft deleted from database but Clerk deletion failed' 
        : 'Employee soft deleted successfully',
      employeeId,
      clerkDeleted,
      clerkError,
      details: {
        employeeSoftDeleted: true,
        userDeleted: true,
        clerkDeleted,
        clerkError
      }
    }, { status });
  } catch (error) {
    console.error('Error deleting employee:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete employee' },
      { status: 500 }
    );
  }
}

 