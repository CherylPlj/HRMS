import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { currentUser } from '@clerk/nextjs/server';
import { validateCSVFile, FILE_SIZE_LIMITS } from '@/lib/fileValidation';

const REQUIRED_FIELDS = [
  'FirstName',
  'LastName',
  'DateOfBirth',
  'Email',
  'Phone',
  'HireDate',
  'Sex',
];

// Helper function to generate unique employee ID
async function generateUniqueEmployeeId(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `${year}-`;

  // Find the latest employee ID for current year using Supabase
  const { data: employees, error } = await supabaseAdmin
    .from('Employee')
    .select('EmployeeID')
    .like('EmployeeID', `${prefix}%`)
    .order('EmployeeID', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching latest employee:', error);
    throw new Error('Failed to generate Employee ID');
  }

  let nextNumber = 1;
  if (employees && employees.length > 0 && employees[0].EmployeeID) {
    const currentNumber = parseInt(employees[0].EmployeeID.split('-')[1]);
    nextNumber = currentNumber + 1;
  }

  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
}

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required. Please sign in and try again.' 
      }, { status: 401 });
    }

    const data = await req.json();
    console.log('IMPORT EMPLOYEE DATA:', data);

    // Check for missing required fields
    const missingFields = REQUIRED_FIELDS.filter(field => !data[field] || data[field] === '');
    if (missingFields.length > 0) {
      const errorMsg = `Missing required field(s): ${missingFields.join(', ')}`;
      console.error(errorMsg);
      return NextResponse.json({ 
        success: false, 
        error: errorMsg 
      }, { status: 400 });
    }

    // Auto-generate Employee ID
    const employeeId = await generateUniqueEmployeeId();

    // Create Employee using Supabase
    const { data: employee, error: employeeError } = await supabaseAdmin
      .from('Employee')
      .insert({
        EmployeeID: employeeId,
        UserID: null,
        LastName: data.LastName,
        FirstName: data.FirstName,
        MiddleName: data.MiddleName || null,
        ExtensionName: data.ExtensionName || null,
        Sex: data.Sex,
        Photo: null, // Photo removed from import
        DateOfBirth: data.DateOfBirth,
        PlaceOfBirth: null,
        CivilStatus: null,
        Nationality: null,
        Religion: null,
        ContractID: null,
        DepartmentID: data.DepartmentID ? Number(data.DepartmentID) : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (employeeError) {
      console.error('Error creating employee:', employeeError);
      throw new Error('Failed to create employee record');
    }

    // Create ContactInfo (only Email and Phone)
    const { error: contactError } = await supabaseAdmin
      .from('ContactInfo')
      .insert({
        employeeId: employeeId,
        Email: data.Email,
        Phone: data.Phone,
        PresentAddress: null,
        PermanentAddress: null,
        EmergencyContactName: null,
        EmergencyContactNumber: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

    if (contactError) {
      console.error('Error creating contact info:', contactError);
      // Don't fail completely, just log
    }

    // Create EmploymentDetail
    const { error: employmentError } = await supabaseAdmin
      .from('EmploymentDetail')
      .insert({
        employeeId: employeeId,
        EmploymentStatus: data.EmploymentStatus || 'Regular',
        ResignationDate: data.ResignationDate || null,
        Designation: data.Designation || null,
        Position: data.Position || null,
        SalaryGrade: data.SalaryGrade || null,
        SalaryAmount: data.SalaryAmount ? Number(data.SalaryAmount) : null,
        HireDate: data.HireDate || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

    if (employmentError) {
      console.error('Error creating employment detail:', employmentError);
      // Don't fail completely, just log
    }

    return NextResponse.json({ success: true, employee, employeeId });
  } catch (error: any) {
    console.error('IMPORT ERROR:', error);
    
    // Return generic error message to user
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to import employee. Please check your data and try again.' 
    }, { status: 500 });
  }
} 