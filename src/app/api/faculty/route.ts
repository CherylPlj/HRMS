import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    const { data: facultyData, error } = await supabaseAdmin
      .from('faculty')
      .select(`
        *,
        user:users (
          first_name,
          last_name,
          email,
          photo
        ),
        department:departments (
          name
        )
      `);

    if (error) {
      console.error('Error fetching faculty:', error);
      return NextResponse.json(
        { error: 'Failed to load faculty data' },
        { status: 500 }
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