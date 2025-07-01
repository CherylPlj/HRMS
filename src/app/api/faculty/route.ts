import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { clerkClient } from '@clerk/clerk-sdk-node';
import type { User as ClerkUser } from '@clerk/nextjs/server';

interface User {
  UserID: string;  // Change to string since Clerk uses string IDs
  FirstName: string;
  LastName: string;
  Email: string;
  Photo: string | null;
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

interface FacultyMember {
  FacultyID: number;
  UserID: string;
  Position: string;
  DepartmentID: number;
  EmploymentStatus: string;
  ResignationDate: string | null;
  Phone: string | null;
  Address: string | null;
  DateOfBirth: string;
  HireDate: string;
  EmergencyContact: string | null;
  Department: {
    DepartmentID: number;
    DepartmentName: string;
  } | null;
  User: {
    UserID: string;
    FirstName: string;
    LastName: string;
    Email: string;
    Photo: string | null;
    Status: string;
    isDeleted: boolean;
  } | null;
}

export async function GET() {
  try {
    // Fetch all faculty members directly from the Faculty table
    const { data: facultyMembers, error } = await supabaseAdmin
      .from('Faculty')
      .select(`
        FacultyID,
        UserID,
        Position,
        DepartmentID,
        EmploymentStatus,
        ResignationDate,
        Phone,
        Address,
        DateOfBirth,
        HireDate,
        EmergencyContact,
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
      .order('FacultyID', { ascending: true });

    if (error) {
      console.error('Error fetching faculty members:', error);
      return NextResponse.json(
        { error: 'Failed to fetch faculty data' },
        { status: 500 }
      );
    }

    // Filter out faculty with deleted users
    const activeFaculty = (facultyMembers as FacultyMember[] || []).filter((faculty: FacultyMember) => !faculty.User?.isDeleted);

    // Transform the data to match the expected Faculty interface structure
    const transformedFaculty = activeFaculty.map((faculty: FacultyMember) => ({
      FacultyID: faculty.FacultyID,
      UserID: faculty.UserID || '',
      Position: faculty.Position || '',
      DepartmentID: faculty.DepartmentID || 0,
      EmploymentStatus: faculty.EmploymentStatus || 'Regular',
      Resignation_Date: faculty.ResignationDate || null,
      Phone: faculty.Phone || null,
      Address: faculty.Address || null,
      DateOfBirth: faculty.DateOfBirth,
      HireDate: faculty.HireDate,
      EmergencyContact: faculty.EmergencyContact || null,
      User: {
        UserID: faculty.UserID || '',
        FirstName: faculty.User?.FirstName || '',
        LastName: faculty.User?.LastName || '',
        Email: faculty.User?.Email || '',
        Photo: faculty.User?.Photo || '',
        Status: faculty.User?.Status || 'Active',
        isDeleted: faculty.User?.isDeleted || false
      },
      Department: {
        DepartmentID: faculty.Department?.DepartmentID || 0,
        DepartmentName: faculty.Department?.DepartmentName || 'Unknown Department'
      }
    }));

    // Fetch Clerk user data for all active employees
    try {
              const userIds = transformedFaculty.map((f: any) => f.UserID).filter((id: string) => id);
      if (userIds.length > 0) {
        const clerkUsers = await clerkClient.users.getUserList({
          userId: userIds,
        });
        const usersArray = clerkUsers.data;
        const clerkUsersMap = new Map(usersArray.map(u => [u.id, u]));

        // Map Clerk user data to faculty
        const facultyWithClerk = transformedFaculty.map((faculty: any) => ({
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