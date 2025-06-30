import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const REQUIRED_FIELDS = [
  'EmployeeID',
  'FirstName',
  'LastName',
  'HireDate',
  'DateOfBirth',
];

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    console.log('IMPORT EMPLOYEE DATA:', data);

    // Check for missing required fields
    const missingFields = REQUIRED_FIELDS.filter(field => !data[field] || data[field] === '');
    if (missingFields.length > 0) {
      const errorMsg = `Missing required field(s): ${missingFields.join(', ')}`;
      console.error(errorMsg);
      return NextResponse.json({ success: false, error: errorMsg, data }, { status: 400 });
    }

    // Create Employee
    const employee = await prisma.employee.create({
      data: {
        EmployeeID: data.EmployeeID,
        UserID: data.UserID || undefined,
        LastName: data.LastName,
        FirstName: data.FirstName,
        MiddleName: data.MiddleName,
        ExtensionName: data.ExtensionName,
        Sex: data.Sex,
        Photo: data.Photo,
        DateOfBirth: new Date(data.DateOfBirth),
        PlaceOfBirth: data.PlaceOfBirth,
        CivilStatus: data.CivilStatus,
        Nationality: data.Nationality,
        Religion: data.Religion,
        BloodType: data.BloodType,
        ContractID: data.ContractID && data.ContractID.trim() !== '' ? Number(data.ContractID) : null,
        DepartmentID: data.DepartmentID ? Number(data.DepartmentID) : undefined,
        Email: data.Email,
        HireDate: new Date(data.HireDate),
        Position: data.Position,
      },
    });

    // Create ContactInfo
    await prisma.contactInfo.create({
      data: {
        employeeId: data.EmployeeID,
        Phone: data.Phone,
        PresentAddress: data.PresentAddress,
        PermanentAddress: data.PermanentAddress,
        EmergencyContactName: data.EmergencyContactName,
        EmergencyContactNumber: data.EmergencyContactNumber,
        Email: data.Email,
      },
    });

    // Create GovernmentID
    await prisma.governmentID.create({
      data: {
        employeeId: data.EmployeeID,
        SSSNumber: data.SSSNumber,
        TINNumber: data.TINNumber,
        PhilHealthNumber: data.PhilHealthNumber,
        PagIbigNumber: data.PagIbigNumber,
        GSISNumber: data.GSISNumber,
        PRCLicenseNumber: data.PRCLicenseNumber,
        PRCValidity: data.PRCValidity ? new Date(data.PRCValidity) : undefined,
      },
    });

    // Create EmploymentDetail
    await prisma.employmentDetail.create({
      data: {
        employeeId: data.EmployeeID,
        EmploymentStatus: data.EmploymentStatus,
        ResignationDate: data.ResignationDate ? new Date(data.ResignationDate) : undefined,
        Designation: data.Designation,
        Position: data.Position,
        SalaryGrade: data.SalaryGrade,
        HireDate: data.HireDate ? new Date(data.HireDate) : undefined,
      },
    });

    return NextResponse.json({ success: true, employee });
  } catch (error: any) {
    console.error('IMPORT ERROR:', error);
    let errorMsg = error.message || 'Unknown error';
    if (error.code) errorMsg += ` (code: ${error.code})`;
    return NextResponse.json({ success: false, error: errorMsg, stack: error.stack }, { status: 400 });
  }
} 