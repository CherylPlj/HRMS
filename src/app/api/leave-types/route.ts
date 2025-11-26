import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { currentUser } from '@clerk/nextjs/server';

export async function GET(request: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all leave types from Supabase - using table name matching Prisma schema
    const { data: leaveTypes, error } = await supabaseAdmin
      .from('LeaveTypes')
      .select('*')
      .order('LeaveTypeName', { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json(leaveTypes || []);
  } catch (error) {
    console.error('Error fetching leave types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leave types' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
    // Validate required fields
    if (!data.LeaveTypeName) {
      return NextResponse.json(
        { error: 'Leave type name is required' },
        { status: 400 }
      );
    }

    // Create leave type in Supabase - matching Prisma schema fields
    const { data: newLeaveType, error } = await supabaseAdmin
      .from('LeaveTypes')
      .insert([
        {
          LeaveTypeName: data.LeaveTypeName,
          NumberOfDays: data.NumberOfDays || null,
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating leave type:', error);
      
      // Handle unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Leave type name already exists' },
          { status: 400 }
        );
      }
      
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(newLeaveType);
  } catch (error) {
    console.error('Error creating leave type:', error);
    return NextResponse.json(
      { error: 'Failed to create leave type' },
      { status: 500 }
    );
  }
}

