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
    const all = searchParams.get('all') === 'true';
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

    // Build the query with joins
    let query = supabaseAdmin
      .from('Employee')
      .select(`
        *,
        EmploymentDetail(EmploymentStatus, HireDate, ResignationDate, Designation, Position, SalaryGrade),
        ContactInfo(Email, Phone, PresentAddress, PermanentAddress, EmergencyContactName, EmergencyContactNumber),
        GovernmentID(SSSNumber, TINNumber, PhilHealthNumber, PagIbigNumber, GSISNumber, PRCLicenseNumber, PRCValidity),
        Department(DepartmentName),
        Family(id, type, name, dateOfBirth, occupation, isDependent, relationship, contactNumber, address),
        skills(id, name, proficiencyLevel, yearsOfExperience, description),
        MedicalInfo(medicalNotes, lastCheckup, vaccination, allergies, hasDisability, disabilityType, disabilityDetails),
        Education(id, level, schoolName, course, yearGraduated, honors),
        Eligibility(id, type, rating, licenseNumber, examDate, validUntil),
        EmploymentHistory(id, schoolName, position, startDate, endDate, reasonForLeaving),
        trainings(id, title, hours, conductedBy, date),
        certificates(id, title, issuedBy, issueDate, expiryDate, description, fileUrl)
      `)
      .order('EmployeeID', { ascending: true });

    // Apply pagination only if not requesting all records
    if (!all) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data: employees, error } = await query;

    if (error) {
      throw error;
    }

    // Return different response structure based on whether all records were requested
    if (all) {
      return NextResponse.json({
        employees,
        totalCount: totalCount || 0
      });
    } else {
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
    }
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
    
    // Validate required fields (excluding EmployeeID since we'll generate it)
    const requiredFields = [
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

    // Generate a unique Employee ID on the server side to prevent race conditions
    let employeeId = data.EmployeeID;
    
    // If no Employee ID provided or if it already exists, generate a new one
    if (!employeeId) {
      employeeId = await generateUniqueEmployeeId();
    } else {
      // Check if the provided Employee ID already exists
      const { data: existingEmployee } = await supabaseAdmin
        .from('Employee')
        .select('EmployeeID')
        .eq('EmployeeID', employeeId)
        .single();
      
      if (existingEmployee) {
        // Employee ID already exists, generate a new one
        employeeId = await generateUniqueEmployeeId();
        console.log(`Employee ID ${data.EmployeeID} already exists, generated new ID: ${employeeId}`);
      }
    }

    // Start a transaction by creating the main employee record first
    const { data: newEmployee, error: employeeError } = await supabaseAdmin
      .from('Employee')
      .insert([{
        EmployeeID: employeeId,
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }])
      .select()
      .single();

    if (employeeError) {
      console.error('Error creating employee:', employeeError);
      return NextResponse.json(
        { error: `Failed to create employee: ${employeeError.message}` },
        { status: 500 }
      );
    }

    // Create EmploymentDetail record
    if (data.HireDate || data.EmploymentStatus || data.Designation || data.Position || data.SalaryGrade) {
      const { error: employmentError } = await supabaseAdmin
        .from('EmploymentDetail')
        .insert([{
          employeeId: employeeId,
          EmploymentStatus: data.EmploymentStatus || 'Regular',
          HireDate: data.HireDate,
          ResignationDate: data.ResignationDate || null,
          Designation: data.Designation || null,
          Position: data.Position || null,
          SalaryGrade: data.SalaryGrade || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }]);

      if (employmentError) {
        console.error('Error creating employment detail:', employmentError);
        // Rollback: delete the employee record
        await supabaseAdmin
          .from('Employee')
          .delete()
          .eq('EmployeeID', employeeId);
        return NextResponse.json(
          { error: `Failed to create employment detail: ${employmentError.message}` },
          { status: 500 }
        );
      }
    }

    // Create ContactInfo record
    if (data.Email || data.Phone || data.PresentAddress || data.PermanentAddress || data.EmergencyContactName || data.EmergencyContactNumber) {
      const { error: contactError } = await supabaseAdmin
        .from('ContactInfo')
        .insert([{
          employeeId: employeeId,
          Email: data.Email || null,
          Phone: data.Phone || null,
          PresentAddress: data.PresentAddress || null,
          PermanentAddress: data.PermanentAddress || null,
          EmergencyContactName: data.EmergencyContactName || null,
          EmergencyContactNumber: data.EmergencyContactNumber || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }]);

      if (contactError) {
        console.error('Error creating contact info:', contactError);
        // Rollback: delete related records
        await supabaseAdmin
          .from('EmploymentDetail')
          .delete()
          .eq('employeeId', employeeId);
        await supabaseAdmin
          .from('Employee')
          .delete()
          .eq('EmployeeID', employeeId);
        return NextResponse.json(
          { error: `Failed to create contact info: ${contactError.message}` },
          { status: 500 }
        );
      }
    }

    // Create GovernmentID record
    if (data.SSSNumber || data.TINNumber || data.PhilHealthNumber || data.PagIbigNumber || data.GSISNumber || data.PRCLicenseNumber || data.PRCValidity) {
      const { error: govIdError } = await supabaseAdmin
        .from('GovernmentID')
        .insert([{
          employeeId: employeeId,
          SSSNumber: data.SSSNumber || null,
          TINNumber: data.TINNumber || null,
          PhilHealthNumber: data.PhilHealthNumber || null,
          PagIbigNumber: data.PagIbigNumber || null,
          GSISNumber: data.GSISNumber || null,
          PRCLicenseNumber: data.PRCLicenseNumber || null,
          PRCValidity: data.PRCValidity || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }]);

      if (govIdError) {
        console.error('Error creating government ID:', govIdError);
        // Rollback: delete related records
        await supabaseAdmin
          .from('ContactInfo')
          .delete()
          .eq('employeeId', employeeId);
        await supabaseAdmin
          .from('EmploymentDetail')
          .delete()
          .eq('employeeId', employeeId);
        await supabaseAdmin
          .from('Employee')
          .delete()
          .eq('EmployeeID', employeeId);
        return NextResponse.json(
          { error: `Failed to create government ID: ${govIdError.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(newEmployee);
    
  } catch (error) {
    console.error('Error in POST /api/employees:', error);
    
    // Log the full error details for debugging
    if (error && typeof error === 'object') {
      console.error('Error details:', JSON.stringify(error, null, 2));
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create employee' },
      { status: 500 }
    );
  }
}

// Helper function to generate a unique Employee ID
async function generateUniqueEmployeeId(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const usedNumbers = new Set<number>();

  // Get all employee IDs for the current year
  const { data: existingEmployees } = await supabaseAdmin
    .from('Employee')
    .select('EmployeeID')
    .like('EmployeeID', `${currentYear}-%`);

  // Process Employee IDs (format: YYYY-NNNN)
  if (existingEmployees) {
    existingEmployees.forEach((employee: { EmployeeID: string }) => {
      const match = employee.EmployeeID.match(new RegExp(`^${currentYear}-(\\d{4})$`));
      if (match) {
        usedNumbers.add(parseInt(match[1], 10));
      }
    });
  }

  // Get all existing users to check for UserID conflicts
  const { data: existingUsers } = await supabaseAdmin
    .from('User')
    .select('UserID');

  // Process User IDs (multiple formats that could conflict)
  if (existingUsers) {
    existingUsers.forEach((user: { UserID: string }) => {
      const userId = user.UserID;

      // Pattern 1: YYYY-NNNN (same as employee format)
      const match1 = userId.match(new RegExp(`^${currentYear}-(\\d{4})$`));
      if (match1) {
        usedNumbers.add(parseInt(match1[1], 10));
      }

      // Pattern 2: YYYYNNNN
      const match2 = userId.match(new RegExp(`^${currentYear}(\\d{4})$`));
      if (match2) {
        usedNumbers.add(parseInt(match2[1], 10));
      }
    });
  }

  // Find the next available number starting from 1
  let nextNumber = 1;
  while (usedNumbers.has(nextNumber)) {
    nextNumber++;
  }

  return `${currentYear}-${nextNumber.toString().padStart(4, '0')}`;
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
