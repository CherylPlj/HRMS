import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { currentUser } from '@clerk/nextjs/server';

export async function GET(request: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all employees from Supabase Faculty table
    const { data: employees, error } = await supabaseAdmin
      .from('Faculty')
      .select(
        `
        *,
        User:UserID (
          UserID,
          FirstName,
          LastName,
          Email,
          Status,
          Photo,
          isDeleted
        ),
        Department:DepartmentID (
          DepartmentID,
          DepartmentName
        )
      `
      )
      .order('FacultyID', { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json(employees);
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
    const requiredFields = ['FirstName', 'LastName', 'Email', 'Position', 'DepartmentID', 'EmploymentStatus', 'EmployeeType'];
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Create user in Supabase Faculty table
    const { data: newEmployee, error } = await supabaseAdmin
      .from('Faculty')
      .insert([
        {
          UserID: data.UserID,
          Position: data.Position,
          DepartmentID: data.DepartmentID,
          EmploymentStatus: data.EmploymentStatus,
          EmployeeType: data.EmployeeType,
          HireDate: data.HireDate || new Date().toISOString(),
          DateOfBirth: data.DateOfBirth,
          Phone: data.Phone,
          Address: data.Address,
          EmergencyContact: data.EmergencyContact,
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

    if (!data.FacultyID) {
      return NextResponse.json(
        { error: 'Missing FacultyID for update' },
        { status: 400 }
      );
    }

    // Update user in Supabase Faculty table
    const { data: updatedEmployee, error } = await supabaseAdmin
      .from('Faculty')
      .update({
        Position: data.Position,
        DepartmentID: data.DepartmentID,
        EmploymentStatus: data.EmploymentStatus,
        EmployeeType: data.EmployeeType,
        HireDate: data.HireDate,
        DateOfBirth: data.DateOfBirth,
        Phone: data.Phone,
        Address: data.Address,
        EmergencyContact: data.EmergencyContact,
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
      .eq('FacultyID', data.FacultyID)
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
