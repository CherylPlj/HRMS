import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { currentUser } from '@clerk/nextjs/server';
import puppeteer from 'puppeteer';

const COLUMN_LABELS: Record<string, string> = {
  EmployeeID: 'Employee ID',
  UserID: 'User ID',
  FirstName: 'First Name',
  LastName: 'Last Name',
  MiddleName: 'Middle Name',
  ExtensionName: 'Extension Name',
  Sex: 'Sex',
  DateOfBirth: 'Date of Birth',
  PlaceOfBirth: 'Place of Birth',
  CivilStatus: 'Civil Status',
  Nationality: 'Nationality',
  Religion: 'Religion',
  BloodType: 'Blood Type',
  Email: 'Email',
  Phone: 'Phone',
  PresentAddress: 'Present Address',
  PermanentAddress: 'Permanent Address',
  Position: 'Position',
  Designation: 'Designation',
  Department: 'Department',
  EmploymentStatus: 'Employment Status',
  HireDate: 'Hire Date',
  ResignationDate: 'Resignation Date',
  SalaryGrade: 'Salary Grade',
  EmployeeType: 'Employee Type',
  SSSNumber: 'SSS Number',
  TINNumber: 'TIN Number',
  PhilHealthNumber: 'PhilHealth Number',
  PagIbigNumber: 'Pag-IBIG Number',
  GSISNumber: 'GSIS Number',
  PRCLicenseNumber: 'PRC License Number',
  PRCValidity: 'PRC Validity',
  EmergencyContactName: 'Emergency Contact Name',
  EmergencyContactNumber: 'Emergency Contact Number',
  createdAt: 'Created At',
  updatedAt: 'Updated At',
};

export async function GET(request: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv'; // csv or pdf
    const departmentFilter = searchParams.get('department');
    const designationFilter = searchParams.get('designation');
    const statusFilter = searchParams.get('status');
    const searchTerm = searchParams.get('search');
    const columnsParam = searchParams.get('columns');
    const paperSize = searchParams.get('paperSize') || 'a4';
    const orderBy = searchParams.get('orderBy') || 'LastName';
    const orderDir = searchParams.get('orderDir') || 'asc';
    const hireDateFrom = searchParams.get('hireDateFrom');
    const hireDateTo = searchParams.get('hireDateTo');
    const orientation = searchParams.get('orientation') || 'portrait';

    // Parse columns
    let selectedColumns = Object.keys(COLUMN_LABELS);
    if (columnsParam) {
      selectedColumns = columnsParam.split(',').filter(col => COLUMN_LABELS[col]);
      if (selectedColumns.length === 0) selectedColumns = Object.keys(COLUMN_LABELS);
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
      .order('createdAt', { ascending: false });

    // Apply filters
    if (departmentFilter && departmentFilter !== 'all') {
      query = query.eq('DepartmentID', departmentFilter);
    }
    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('EmploymentDetail.EmploymentStatus', statusFilter);
    }
    if (searchTerm) {
      query = query.or(`FirstName.ilike.%${searchTerm}%,LastName.ilike.%${searchTerm}%,ContactInfo.Email.ilike.%${searchTerm}%`);
    }

    const { data: employees, error } = await query;
    if (error) {
      throw error;
    }

    // Filter by designation in JavaScript since it's in a nested object
    let filteredEmployees = employees || [];
    if (designationFilter && designationFilter !== 'all') {
      filteredEmployees = filteredEmployees.filter((emp: any) => 
        emp.EmploymentDetail?.[0]?.Designation === designationFilter
      );
    }

    // After filtering by designation, filter by hire date range
    if (hireDateFrom || hireDateTo) {
      filteredEmployees = filteredEmployees.filter((emp: any) => {
        const employmentDetail = emp.EmploymentDetail?.[0] || {};
        const hireDate = employmentDetail.HireDate ? new Date(employmentDetail.HireDate) : null;
        let valid = true;
        if (hireDateFrom) {
          valid = valid && !!hireDate && hireDate >= new Date(hireDateFrom);
        }
        if (hireDateTo) {
          valid = valid && !!hireDate && hireDate <= new Date(hireDateTo);
        }
        return valid;
      });
    }

    // Sort in JS
    filteredEmployees = filteredEmployees.sort((a: any, b: any) => {
      let aVal = '', bVal = '';
      if (orderBy === 'LastName') {
        aVal = (a.LastName || '').toLowerCase();
        bVal = (b.LastName || '').toLowerCase();
      } else if (orderBy === 'FirstName') {
        aVal = (a.FirstName || '').toLowerCase();
        bVal = (b.FirstName || '').toLowerCase();
      } else if (orderBy === 'EmployeeID') {
        aVal = a.EmployeeID || '';
        bVal = b.EmployeeID || '';
      }
      if (aVal < bVal) return orderDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return orderDir === 'asc' ? 1 : -1;
      return 0;
    });

    if (format === 'csv') {
      return generateCSV(filteredEmployees, selectedColumns);
    } else if (format === 'pdf') {
      const html = generatePDFHtml(filteredEmployees, selectedColumns, paperSize);
      // Puppeteer PDF generation
      const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({
        format: paperSize === 'a4' ? 'A4' : paperSize === 'letter' ? 'Letter' : 'Legal',
        printBackground: true,
        margin: { top: '24mm', right: '16mm', bottom: '24mm', left: '16mm' },
        landscape: orientation === 'landscape',
      });
      await browser.close();
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="employees_report_${new Date().toISOString().split('T')[0]}.pdf"`
        }
      });
    } else {
      return NextResponse.json({ error: 'Invalid format. Use "csv" or "pdf"' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error exporting employees:', error);
    return NextResponse.json(
      { error: 'Failed to export employees' },
      { status: 500 }
    );
  }
}

function getColumnValue(emp: any, col: string) {
  const employmentDetail = emp.EmploymentDetail?.[0] || {};
  const contactInfo = emp.ContactInfo?.[0] || {};
  const governmentID = emp.GovernmentID?.[0] || {};
  const department = emp.Department || {};
  switch (col) {
    case 'EmployeeID': return emp.EmployeeID || '';
    case 'UserID': return emp.UserID || '';
    case 'FirstName': return emp.FirstName || '';
    case 'LastName': return emp.LastName || '';
    case 'MiddleName': return emp.MiddleName || '';
    case 'ExtensionName': return emp.ExtensionName || '';
    case 'Sex': return emp.Sex || '';
    case 'DateOfBirth': return emp.DateOfBirth ? new Date(emp.DateOfBirth).toLocaleDateString() : '';
    case 'PlaceOfBirth': return emp.PlaceOfBirth || '';
    case 'CivilStatus': return emp.CivilStatus || '';
    case 'Nationality': return emp.Nationality || '';
    case 'Religion': return emp.Religion || '';
    case 'BloodType': return emp.BloodType || '';
    case 'Email': return contactInfo.Email || '';
    case 'Phone': return contactInfo.Phone || '';
    case 'PresentAddress': return contactInfo.PresentAddress || '';
    case 'PermanentAddress': return contactInfo.PermanentAddress || '';
    case 'Position': return employmentDetail.Position || '';
    case 'Designation':
      return (employmentDetail.Designation || '').replace(/_/g, ' ');
    case 'Department': return department.DepartmentName || '';
    case 'EmploymentStatus': return employmentDetail.EmploymentStatus || '';
    case 'HireDate': return employmentDetail.HireDate ? new Date(employmentDetail.HireDate).toLocaleDateString() : '';
    case 'ResignationDate': return employmentDetail.ResignationDate ? new Date(employmentDetail.ResignationDate).toLocaleDateString() : '';
    case 'SalaryGrade': return employmentDetail.SalaryGrade || '';
    case 'EmployeeType': return emp.EmployeeType || '';
    case 'SSSNumber': return governmentID.SSSNumber || '';
    case 'TINNumber': return governmentID.TINNumber || '';
    case 'PhilHealthNumber': return governmentID.PhilHealthNumber || '';
    case 'PagIbigNumber': return governmentID.PagIbigNumber || '';
    case 'GSISNumber': return governmentID.GSISNumber || '';
    case 'PRCLicenseNumber': return governmentID.PRCLicenseNumber || '';
    case 'PRCValidity': return governmentID.PRCValidity ? new Date(governmentID.PRCValidity).toLocaleDateString() : '';
    case 'EmergencyContactName': return contactInfo.EmergencyContactName || '';
    case 'EmergencyContactNumber': return contactInfo.EmergencyContactNumber || '';
    case 'createdAt': return emp.createdAt ? new Date(emp.createdAt).toLocaleDateString() : '';
    case 'updatedAt': return emp.updatedAt ? new Date(emp.updatedAt).toLocaleDateString() : '';
    default: return '';
  }
}

function generateCSV(employees: any[], columns: string[]) {
  // Define CSV headers
  const headers = columns.map(col => COLUMN_LABELS[col] || col);
  // Convert employees to CSV rows
  const rows = employees.map(emp => columns.map(col => `"${getColumnValue(emp, col)}"`));
  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
  // Return CSV response
  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="employees_export_${new Date().toISOString().split('T')[0]}.csv"`
    }
  });
}

function getPaperSizeStyle(paperSize: string) {
  switch (paperSize) {
    case 'letter':
      return 'width: 8.5in; height: 11in;';
    case 'legal':
      return 'width: 8.5in; height: 14in;';
    case 'a4':
    default:
      return 'width: 210mm; height: 297mm;';
  }
}

function generatePDFHtml(employees: any[], columns: string[], paperSize: string) {
  const headers = columns.map(col => `<th>${COLUMN_LABELS[col] || col}</th>`).join('');
  const rows = employees.map(emp =>
    `<tr>${columns.map(col => `<td>${getColumnValue(emp, col)}</td>`).join('')}</tr>`
  ).join('');
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Employee Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; }
        .pdf-page { ${getPaperSizeStyle(paperSize)} margin: 0 auto; background: #fff; padding: 16mm 8mm; box-sizing: border-box; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
        th { background-color: #f2f2f2; font-weight: bold; }
        .header { text-align: center; margin-bottom: 20px; }
        .header h1 { color: #800000; margin: 0; }
        .header p { color: #666; margin: 5px 0; }
        .summary { margin-bottom: 20px; }
        .summary p { margin: 5px 0; }
      </style>
    </head>
    <body>
      <div class="pdf-page">
        <div class="header">
          <h1>Employee Report</h1>
          <p>Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          <p>Total Employees: ${employees.length}</p>
        </div>
        <div class="summary">
          <p><strong>Report Summary:</strong></p>
          <p>• Total Records: ${employees.length}</p>
          <p>• Date Range: ${employees.length > 0 ? new Date(employees[employees.length - 1].createdAt).toLocaleDateString() : 'N/A'} to ${employees.length > 0 ? new Date(employees[0].createdAt).toLocaleDateString() : 'N/A'}</p>
        </div>
        <table>
          <thead>
            <tr>${headers}</tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    </body>
    </html>
  `;
  return htmlContent;
} 