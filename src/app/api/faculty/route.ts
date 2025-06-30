import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { clerkClient } from '@clerk/clerk-sdk-node';
import type { User as ClerkUser } from '@clerk/nextjs/server';

interface User {
  UserID: string;  // Change to string since Clerk uses string IDs
  FirstName: string;
  LastName: string;
  Email: string;
  Photo: string;
  Status: string;
  isDeleted: boolean;
}

interface Department {
  DepartmentID: number;
  DepartmentName: string;
}

interface Faculty {
  FacultyID: number;
  UserID: string;  // Change to string since Clerk uses string IDs
  Position: string;
  DepartmentID: number;
  EmploymentStatus: string;
  Resignation_Date: string | null;
  Phone: string | null;
  Address: string | null;
  User: User;
  Department: Department;
}

interface EmployeeWithFacultyDesignation {
  EmployeeID: string;
  UserID: string;
  FirstName: string;
  LastName: string;
  MiddleName: string | null;
  ExtensionName: string | null;
  Email: string | null;
  Photo: string | null;
  DepartmentID: number | null;
  Position: string | null;
  DateOfBirth: string;
  HireDate: string;
  employmentDetail: {
    EmploymentStatus: string;
    Designation: string;
    Position: string | null;
    HireDate: string | null;
    ResignationDate: string | null;
  } | null;
  contactInfo: {
    Email: string | null;
    Phone: string | null;
    PresentAddress: string | null;
  } | null;
  Department: {
    DepartmentID: number;
    DepartmentName: string;
  } | null;
  User: {
    UserID: string;
    FirstName: string;
    LastName: string;
    Email: string;
    Status: string;
    isDeleted: boolean;
  } | null;
}

export async function GET() {
  try {
    // Fetch all employees with Faculty designation
    const { data: employees, error } = await supabaseAdmin
      .from('Employee')
      .select(`
        EmployeeID,
        UserID,
        FirstName,
        LastName,
        MiddleName,
        ExtensionName,
        Email,
        Photo,
        DepartmentID,
        Position,
        DateOfBirth,
        HireDate,
        employmentDetail:EmploymentDetail (
          EmploymentStatus,
          Designation,
          Position,
          HireDate,
          ResignationDate
        ),
        contactInfo:ContactInfo (
          Email,
          Phone,
          PresentAddress
        ),
        Department:DepartmentID (
          DepartmentID,
          DepartmentName
        ),
        User:UserID (
          UserID,
          FirstName,
          LastName,
          Email,
          Status,
          isDeleted
        )
      `)
      .eq('employmentDetail.Designation', 'Faculty')
      .order('EmployeeID', { ascending: true });

    if (error) {
      console.error('Error fetching employees with Faculty designation:', error);
      return NextResponse.json(
        { error: 'Failed to fetch faculty data' },
        { status: 500 }
      );
    }

    // Filter out employees with deleted users
    const activeEmployees = (employees as EmployeeWithFacultyDesignation[] || []).filter(emp => !emp.User?.isDeleted);

    // Transform the data to match the expected Faculty interface structure
    const transformedFaculty = activeEmployees.map((emp, index) => ({
      FacultyID: parseInt(emp.EmployeeID.replace(/\D/g, '')) || index + 1, // Extract numeric part from EmployeeID or use index
      UserID: emp.UserID || '',
      Position: emp.employmentDetail?.Position || emp.Position || '',
      DepartmentID: emp.DepartmentID || 0,
      EmploymentStatus: emp.employmentDetail?.EmploymentStatus || 'Regular',
      Resignation_Date: emp.employmentDetail?.ResignationDate || null,
      Phone: emp.contactInfo?.Phone || null,
      Address: emp.contactInfo?.PresentAddress || null,
      User: {
        UserID: emp.UserID || '',
        FirstName: emp.User?.FirstName || emp.FirstName || '',
        LastName: emp.User?.LastName || emp.LastName || '',
        Email: emp.User?.Email || emp.contactInfo?.Email || emp.Email || '',
        Photo: emp.Photo || '',
        Status: emp.User?.Status || 'Active',
        isDeleted: emp.User?.isDeleted || false
      },
      Department: {
        DepartmentID: emp.Department?.DepartmentID || 0,
        DepartmentName: emp.Department?.DepartmentName || 'Unknown Department'
      }
    }));

    // Fetch Clerk user data for all active employees
    try {
      const userIds = transformedFaculty.map(f => f.UserID).filter(id => id);
      if (userIds.length > 0) {
        const clerkUsers = await clerkClient.users.getUserList({
          userId: userIds,
        });
        const usersArray = clerkUsers.data;
        const clerkUsersMap = new Map(usersArray.map(u => [u.id, u]));

        // Map Clerk user data to faculty
        const facultyWithClerk = transformedFaculty.map(faculty => ({
          ...faculty,
          ClerkUser: clerkUsersMap.get(faculty.UserID) || null,
        }));

        console.log('Enriched faculty with Clerk data:', facultyWithClerk.length);
        return NextResponse.json(facultyWithClerk);
      } else {
        return NextResponse.json(transformedFaculty);
      }
    } catch (clerkError) {
      console.error('Error fetching Clerk user data:', clerkError);
      // Return faculty data without photos if Clerk fetch fails
      return NextResponse.json(transformedFaculty);
    }
  } catch (error) {
    console.error('Error in faculty GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}