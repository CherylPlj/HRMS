import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const department = searchParams.get('department');
    const status = searchParams.get('status');
    const search = searchParams.get('search') || '';

    // Calculate offset
    const offset = (page - 1) * pageSize;

    // Build query
    let query = supabase
      .from('Faculty')
      .select(`
        FacultyID,
        UserID,
        Position,
        DepartmentID,
        EmploymentStatus,
        Resignation_Date,
        Phone,
        Address,
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
      `, { count: 'exact' })
      .eq('User.isDeleted', false)
      .range(offset, offset + pageSize - 1);

    // Add filters
    if (department && department !== 'all') {
      query = query.eq('DepartmentID', department);
    }
    if (status && status !== 'all') {
      query = query.eq('EmploymentStatus', status);
    }
    if (search) {
      query = query.or(`User.FirstName.ilike.%${search}%,User.LastName.ilike.%${search}%,User.Email.ilike.%${search}%`);
    }

    // Execute query
    const { data: faculty, error, count } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      faculty: faculty || [],
      total: count || 0,
      page,
      pageSize
    });

  } catch (error) {
    console.error('Error fetching faculty:', error);
    return NextResponse.json(
      { error: 'Failed to fetch faculty data' },
      { status: 500 }
    );
  }
}