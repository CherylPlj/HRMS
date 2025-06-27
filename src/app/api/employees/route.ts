import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { currentUser } from '@clerk/nextjs/server';

export async function GET(request: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get pagination parameters from URL
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Get total count
    const { count: totalCount, error: countError } = await supabaseAdmin
      .from('Employee')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      throw countError;
    }

    // Get employees from Supabase Employee table with pagination
    const { data: employees, error } = await supabaseAdmin
      .from('Employee')
      .select('*')
      .order('EmployeeID', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    const totalPages = Math.ceil((totalCount || 0) / limit);

    return NextResponse.json({
      employees,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount: totalCount || 0,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    console.log('Received employee data:', data);
    
    // Validate required fields
    const requiredFields = [
      'EmployeeID',
      'FirstName',
      'LastName',
      'DateOfBirth',
      'HireDate',
      'Sex',
      'Email',
      'Phone'
    ];
    
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Start a transaction by creating the main employee record first
    const { data: newEmployee, error: employeeError } = await supabaseAdmin
      .from('Employee')
      .insert([{
        EmployeeID: data.EmployeeID,
        UserID: data.UserID || null,
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
        createdAt: new Date().toISOString()
      }])
      .select()
      .single();

    if (employeeError) {
      console.error('Error creating employee:', employeeError);
      throw employeeError;
    }

    // Create EmploymentDetail record
    if (data.HireDate || data.EmploymentStatus || data.Designation || data.Position || data.SalaryGrade) {
      const { error: employmentError } = await supabaseAdmin
        .from('EmploymentDetail')
        .insert([{
          employeeId: data.EmployeeID,
          EmploymentStatus: data.EmploymentStatus || 'Regular',
          HireDate: data.HireDate,
          ResignationDate: data.ResignationDate || null,
          Designation: data.Designation || null,
          Position: data.Position || null,
          SalaryGrade: data.SalaryGrade || null,
          createdAt: new Date().toISOString()
        }]);

      if (employmentError) {
        console.error('Error creating employment detail:', employmentError);
        // Rollback: delete the employee record
        await supabaseAdmin
          .from('Employee')
          .delete()
          .eq('EmployeeID', data.EmployeeID);
        throw employmentError;
      }
    }

    // Create ContactInfo record
    if (data.Email || data.Phone || data.PresentAddress || data.PermanentAddress || data.EmergencyContactName || data.EmergencyContactNumber) {
      const { error: contactError } = await supabaseAdmin
        .from('ContactInfo')
        .insert([{
          employeeId: data.EmployeeID,
          Email: data.Email || null,
          Phone: data.Phone || null,
          PresentAddress: data.PresentAddress || null,
          PermanentAddress: data.PermanentAddress || null,
          EmergencyContactName: data.EmergencyContactName || null,
          EmergencyContactNumber: data.EmergencyContactNumber || null,
          createdAt: new Date().toISOString()
        }]);

      if (contactError) {
        console.error('Error creating contact info:', contactError);
        // Rollback: delete related records
        await supabaseAdmin
          .from('EmploymentDetail')
          .delete()
          .eq('employeeId', data.EmployeeID);
        await supabaseAdmin
          .from('Employee')
          .delete()
          .eq('EmployeeID', data.EmployeeID);
        throw contactError;
      }
    }

    // Create GovernmentID record
    if (data.SSSNumber || data.TINNumber || data.PhilHealthNumber || data.PagIbigNumber || data.GSISNumber || data.PRCLicenseNumber || data.PRCValidity) {
      const { error: govIdError } = await supabaseAdmin
        .from('GovernmentID')
        .insert([{
          employeeId: data.EmployeeID,
          SSSNumber: data.SSSNumber || null,
          TINNumber: data.TINNumber || null,
          PhilHealthNumber: data.PhilHealthNumber || null,
          PagIbigNumber: data.PagIbigNumber || null,
          GSISNumber: data.GSISNumber || null,
          PRCLicenseNumber: data.PRCLicenseNumber || null,
          PRCValidity: data.PRCValidity || null,
          createdAt: new Date().toISOString()
        }]);

      if (govIdError) {
        console.error('Error creating government ID:', govIdError);
        // Rollback: delete related records
        await supabaseAdmin
          .from('ContactInfo')
          .delete()
          .eq('employeeId', data.EmployeeID);
        await supabaseAdmin
          .from('EmploymentDetail')
          .delete()
          .eq('employeeId', data.EmployeeID);
        await supabaseAdmin
          .from('Employee')
          .delete()
          .eq('EmployeeID', data.EmployeeID);
        throw govIdError;
      }
    }

    return NextResponse.json(newEmployee);
  } catch (error) {
    console.error('Error creating employee:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create employee' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    if (!data.EmployeeID) {
      return NextResponse.json(
        { error: 'Missing EmployeeID for update' },
        { status: 400 }
      );
    }

    // Update employee in Supabase Employee table (only basic fields)
    const { data: updatedEmployee, error: employeeError } = await supabaseAdmin
      .from('Employee')
      .update({
        UserID: data.UserID || null,
        LastName: data.LastName,
        FirstName: data.FirstName,
        MiddleName: data.MiddleName || null,
        ExtensionName: data.ExtensionName || null,
        Sex: data.Sex,
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
      .eq('EmployeeID', data.EmployeeID)
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
          employeeId: data.EmployeeID,
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
          employeeId: data.EmployeeID,
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
          employeeId: data.EmployeeID,
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
      { error: 'Failed to update employee' },
      { status: 500 }
    );
  }
}
