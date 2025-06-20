import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const { data: user, error } = await supabase
      .from('User')
      .select(`
        UserID,
        Status,
        Email,
        Role:UserRole!inner (
          role:Role (
            name
          )
        )
      `)
      .eq('Email', email)
      .eq('isDeleted', false)
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Transform the response to flatten role names
    const transformedUser = {
      ...user,
      Role: (user.Role as any[]).map((r: any) => r.role.name)
    };

    return NextResponse.json(transformedUser);

  } catch (error) {
    console.error('Error in verifyUserRole:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 