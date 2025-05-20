import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    const { data: facultyData, error } = await supabaseAdmin
      .from('Faculty')
      .select(`
        *,
        User (
          FirstName,
          LastName,
          Email,
          Photo
        ),
        Department (
          DepartmentName
        )
      `);

    if (error) {
      console.error('Error fetching faculty:', error);
      return NextResponse.json(
        { error: 'Failed to load faculty data' },
        { status: 500 }
      );
    }

    if (!facultyData || facultyData.length === 0) {
      return NextResponse.json(
        { message: 'No faculty records found', data: [] },
        { status: 200 }
      );
    }

    return NextResponse.json(facultyData || []);
  } catch (error: string | unknown) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}