import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(
  request: NextRequest,
  { params }: { params: { employeeId: string } }
): Promise<NextResponse> {
  try {
    const { employeeId } = params;
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    console.log('Fetching attendance history for employee:', employeeId);
    console.log('Date range:', { startDate, endDate });

    const { data: records, error } = await supabase
      .from('Attendance')
      .select('*')
      .eq('employeeId', employeeId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching attendance history:', error);
      return NextResponse.json(
        { error: `Error fetching attendance history: ${error.message}` },
        { status: 500 }
      );
    }

    console.log('Successfully fetched attendance history:', records);
    return NextResponse.json(records);
  } catch (error) {
    console.error('Unexpected error in attendance history:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch attendance history' },
      { status: 500 }
    );
  }
} 