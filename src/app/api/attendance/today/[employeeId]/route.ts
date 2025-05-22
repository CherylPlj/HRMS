import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(
  request: NextRequest,
  { params }: { params: { employeeId: string } }
): Promise<NextResponse> {
  try {
    const { employeeId } = params;
    console.log('Fetching today\'s record for employee:', employeeId);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const { data: record, error } = await supabase
      .from('Attendance')
      .select('*')
      .eq('employeeId', employeeId)
      .gte('date', today.toISOString())
      .lt('date', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString())
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('No record found for today');
        return NextResponse.json(null);
      }
      console.error('Error fetching today\'s record:', error);
      return NextResponse.json(
        { error: `Error fetching today's record: ${error.message}` },
        { status: 500 }
      );
    }

    console.log('Successfully fetched today\'s record:', record);
    return NextResponse.json(record);
  } catch (error) {
    console.error('Unexpected error in today\'s record:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch today\'s record' },
      { status: 500 }
    );
  }
} 