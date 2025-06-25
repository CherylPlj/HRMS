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
    const requiredFields = ['EmployeeID', 'DateOfBirth', 'HireDate'];
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
      .insert([
        {
          EmployeeID: data.EmployeeID,
          UserID: data.UserID || null,
          DateOfBirth: data.DateOfBirth,
          Phone: data.Phone,
          Address: data.Address,
          EmploymentStatus: data.EmploymentStatus || 'Regular',
          HireDate: data.HireDate,
          ResignationDate: data.ResignationDate || null,
          Position: data.Position,
          DepartmentID: data.DepartmentID || null,
          ContractID: data.ContractID || null,
          EmergencyContactName: data.EmergencyContactName,
          EmergencyContactNumber: data.EmergencyContactNumber,
          EmployeeType: data.EmployeeType || 'Regular',
          Designation: data.Designation
        }
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(newEmployee);
  } catch (error) {
    console.error('Error creating employee:', error);
    return NextResponse.json(
      { error: 'Failed to create employee' },
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
