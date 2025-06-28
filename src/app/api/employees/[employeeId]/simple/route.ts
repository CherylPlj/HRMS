import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { currentUser } from '@clerk/nextjs/server';

export async function GET(
  request: Request,
  context: { params: Promise<{ employeeId: string }> }
) {
  try {
    // Check authentication
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employeeId } = await context.params;

    console.log('Fetching employee with ID:', employeeId);

    // Fetch employee data with basic info only
    const { data: employee, error } = await supabaseAdmin
      .from('Employee')
      .select('*')
      .eq('EmployeeID', employeeId)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Database error: ' + error.message },
        { status: 500 }
      );
    }

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    console.log('Employee found:', employee);
    return NextResponse.json(employee);
  } catch (error) {
    console.error('Error fetching employee data:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
} 