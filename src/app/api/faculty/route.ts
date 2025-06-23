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

export async function GET() {
  try {
    // const user = await currentUser();
    // if (!user) {
    //   console.log('No authenticated user found');
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // console.log('Fetching faculty data for user:', user.id);

    // First get all faculty
    const { data: faculty, error } = await supabaseAdmin
      .from('Faculty')
      .select(`
        *,
        User:UserID (
          UserID,
          FirstName,
          LastName,
          Email,
          Status,
          isDeleted
        ),
        Department:DepartmentID (
          DepartmentID,
          DepartmentName
        )
      `)
      .order('FacultyID', { ascending: true });

    if (error) {
      console.error('Error fetching faculty:', error);
      return NextResponse.json(
        { error: 'Failed to fetch faculty data' },
        { status: 500 }
      );
    }

    // Filter out faculty with deleted users
    const activeFaculty = (faculty as Faculty[] || []).filter(f => !f.User?.isDeleted);

    // Fetch Clerk user data for all active faculty
    try {
      const clerkUsers = await clerkClient.users.getUserList({
        userId: activeFaculty.map(f => f.User.UserID),
      });
      const usersArray = clerkUsers.data;
      const clerkUsersMap = new Map(usersArray.map(u => [u.id, u]));

      // Map Clerk user data to faculty
      const facultyWithClerk = activeFaculty.map(faculty => ({
        ...faculty,
        ClerkUser: clerkUsersMap.get(faculty.User.UserID) || null,
      }));

      console.log('Enriched faculty with Clerk data:', facultyWithClerk.length);
      return NextResponse.json(facultyWithClerk);
    } catch (clerkError) {
      console.error('Error fetching Clerk user data:', clerkError);
      // Return faculty data without photos if Clerk fetch fails
      return NextResponse.json(activeFaculty);
    }
  } catch (error) {
    console.error('Error in faculty GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}