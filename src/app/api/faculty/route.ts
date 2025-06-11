import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { currentUser } from '@clerk/nextjs/server';

interface User {
  UserID: number;
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
  UserID: number;
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
    const user = await currentUser();
    if (!user) {
      console.log('No authenticated user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Fetching faculty data for user:', user.id);

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
          Photo,
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

    console.log('Raw faculty data from database:', faculty);

    // Filter out faculty with deleted users on the server side
    const activeFaculty = (faculty as Faculty[] || []).filter(f => !f.User?.isDeleted);

    console.log('Active faculty count:', activeFaculty.length);
    console.log('Active faculty data:', activeFaculty.map(f => ({
      id: f.FacultyID,
      name: `${f.User?.FirstName} ${f.User?.LastName}`,
      isDeleted: f.User?.isDeleted,
      status: f.User?.Status
    })));

    return NextResponse.json(activeFaculty);
  } catch (error) {
    console.error('Error in faculty GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}