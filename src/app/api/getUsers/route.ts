import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    console.log('Fetching users from API route...');
    
    const { data: usersData, error: usersError } = await supabaseAdmin
      .from('User')
      .select(`
        UserID,
        FirstName,
        LastName,
        Email,
        Photo,
        Role,
        Status,
        DateCreated,
        DateModified,
        LastLogin,
        Faculty (
          FacultyID,
          DepartmentID,
          Department (
            DepartmentName
          )
        )
      `);

    if (usersError) {
      console.error('Error fetching users:', {
        message: usersError.message,
        details: usersError.details,
        hint: usersError.hint,
        code: usersError.code
      });
      return NextResponse.json(
        { error: usersError.message || 'Failed to fetch users' },
        { status: 500 }
      );
    }

    if (!usersData) {
      return NextResponse.json(
        { error: 'No users found' },
        { status: 404 }
      );
    }

    console.log('Users fetched successfully:', usersData.length);
    return NextResponse.json(usersData);
  } catch (error: unknown) {
    console.error('Unexpected error in getUsers:', error);
    return NextResponse.json(
      { error: typeof error === 'object' && error !== null && 'message' in error ? (error as { message: string }).message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}