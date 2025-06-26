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
    
    // Validate required fields
    const requiredFields = [
      'EmployeeID',
      'FirstName',
      'LastName',
      'DateOfBirth',
      'HireDate',
      'Sex'
    ];
    
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Create employee in Supabase Employee table
    const { data: newEmployee, error } = await supabaseAdmin
      .from('Employee')
      .insert([{
        EmployeeID: data.EmployeeID,
        UserID: data.UserID || null,
        FacultyID: data.FacultyID || null,
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
        
        createdAt: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating employee:', error);
      throw error;
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

    // Update employee in Supabase Employee table
    const { data: updatedEmployee, error } = await supabaseAdmin
      .from('Employee')
      .update({
        UserID: data.UserID,
        DateOfBirth: data.DateOfBirth,
        Phone: data.Phone,
        Address: data.Address,
        EmploymentStatus: data.EmploymentStatus,
        HireDate: data.HireDate,
        ResignationDate: data.ResignationDate,
        Position: data.Position,
        DepartmentID: data.DepartmentID,
        ContractID: data.ContractID,
        EmergencyContactName: data.EmergencyContactName,
        EmergencyContactNumber: data.EmergencyContactNumber,
        EmployeeType: data.EmployeeType,
        Designation: data.Designation
      })
      .eq('EmployeeID', data.EmployeeID)
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
