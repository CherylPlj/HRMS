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

    // Get current employment details before updating
    let currentEmploymentDetail = null;
    try {
      const { data: currentEmp } = await supabaseAdmin
        .from('EmploymentDetail')
        .select('*')
        .eq('employeeId', employeeId)
        .single();
      currentEmploymentDetail = currentEmp;
    } catch (e) {
      console.log('No current employment detail found');
    }

    // Update employee in Supabase Employee table (only basic fields)
    const updateFields: any = {
      updatedAt: new Date().toISOString()
    };

    // Only include fields that are provided in the request
    if (data.UserID !== undefined) {
      // Ensure UserID is either a valid string or null, never an empty string
      updateFields.UserID = data.UserID && data.UserID.trim() !== '' ? data.UserID.trim() : null;
    }
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
      
      // Handle specific database errors
      if (employeeError.code === '23505') {
        if (employeeError.message.includes('UserID')) {
          return NextResponse.json(
            { error: 'UserID already exists. Please use a different UserID or leave it empty.' },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { error: 'A record with this information already exists.' },
          { status: 400 }
        );
      }
      
      throw employeeError;
    }

    // Check if employment-related fields are being updated
    const employmentFieldsChanged = 
      data.HireDate !== undefined || 
      data.EmploymentStatus !== undefined || 
      data.Designation !== undefined || 
      data.Position !== undefined || 
      data.SalaryGrade !== undefined ||
      data.SalaryAmount !== undefined;

    // Update or create EmploymentDetail record
    if (employmentFieldsChanged) {
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
          SalaryAmount: data.SalaryAmount !== undefined ? (data.SalaryAmount || null) : undefined,
          updatedAt: new Date().toISOString()
        }, {
          onConflict: 'employeeId'
        });

      if (employmentError) {
        console.error('Error updating employment detail:', employmentError);
        throw employmentError;
      }

      // Check if position, salary, or employment status changed and create promotion history record
      const positionChanged = currentEmploymentDetail && 
        currentEmploymentDetail.Position !== data.Position && 
        data.Position !== undefined;
      
      const salaryChanged = currentEmploymentDetail && 
        currentEmploymentDetail.SalaryGrade !== data.SalaryGrade && 
        data.SalaryGrade !== undefined;
      
      const statusChanged = currentEmploymentDetail && 
        currentEmploymentDetail.EmploymentStatus !== data.EmploymentStatus && 
        data.EmploymentStatus !== undefined;

      if (positionChanged || salaryChanged || statusChanged) {
        // Determine promotion type based on what changed
        let promotionType = 'Other';
        if (positionChanged && salaryChanged) {
          promotionType = 'Promotion';
        } else if (positionChanged) {
          promotionType = 'Position Change';
        } else if (salaryChanged) {
          promotionType = 'Salary Adjustment';
        } else if (statusChanged) {
          promotionType = 'Status Change';
        }

        // Create promotion history record
        const { error: promotionError } = await supabaseAdmin
          .from('PromotionHistory')
          .insert({
            employeeId: employeeId,
            fromPosition: currentEmploymentDetail?.Position || null,
            toPosition: data.Position || currentEmploymentDetail?.Position || null,
            fromSalaryGrade: currentEmploymentDetail?.SalaryGrade || null,
            toSalaryGrade: data.SalaryGrade || currentEmploymentDetail?.SalaryGrade || null,
            effectiveDate: new Date().toISOString(),
            promotionType: promotionType,
            remarks: `Automatic record created due to ${promotionType.toLowerCase()}`,
            approvedBy: user.id,
            createdBy: user.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });

        if (promotionError) {
          console.error('Error creating promotion history record:', promotionError);
          // Don't throw error here as the main update was successful
          // Just log it for debugging
        } else {
          console.log(`Promotion history record created for employee ${employeeId}: ${promotionType}`);
        }
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

    // Fetch the complete updated data to return
    const { data: completeEmployee, error: fetchError } = await supabaseAdmin
      .from('Employee')
      .select('*')
      .eq('EmployeeID', employeeId)
      .single();

    if (fetchError) {
      console.error('Error fetching updated employee:', fetchError);
      throw fetchError;
    }

    // Fetch related data
    let employmentDetail = null;
    let contactInfo = null;
    let governmentId = null;
    let department = null;

    try {
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
      if (completeEmployee.DepartmentID) {
        const { data: dept } = await supabaseAdmin
          .from('Department')
          .select('DepartmentName, type')
          .eq('DepartmentID', completeEmployee.DepartmentID)
          .single();
        department = dept;
      }
    } catch (e) {
      console.log('No department found');
    }

    // Return complete updated data
    const result = {
      ...completeEmployee,
      EmploymentDetail: employmentDetail,
      ContactInfo: contactInfo,
      GovernmentID: governmentId,
      Department: department
    };

    return NextResponse.json(result);
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
        updatedAt: new Date().toISOString(),
        updatedBy: user.id
      })
      .eq('EmployeeID', employeeId);

    if (deleteError) {
      console.error('Error soft deleting employee record:', deleteError);
      throw new Error(`Failed to soft delete employee record: ${deleteError.message}`);
    }

    // Soft delete all related records that support soft delete
    // Note: Some tables may not have isDeleted or updatedAt fields
    const relatedTables = ['ContactInfo', 'GovernmentID', 'EmploymentDetail', 'Family', 'Certificate', 'Skill'];
    
    for (const table of relatedTables) {
      try {
        const { error: relatedError } = await supabaseAdmin
          .from(table)
          .update({
            isDeleted: true,
            updatedAt: new Date().toISOString(),
            updatedBy: user.id
          })
          .eq('employeeId', employeeId);

        if (relatedError) {
          // Log but don't fail - some tables might not have these fields
          console.error(`Error soft deleting ${table}:`, relatedError);
        }
      } catch (error) {
        // Continue if table doesn't support soft delete
        console.warn(`Could not soft delete from ${table}:`, error);
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

 