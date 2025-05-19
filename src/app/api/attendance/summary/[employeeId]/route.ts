import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

type AttendanceRecord = {
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'NOT_RECORDED';
};

export async function GET(
  request: NextRequest,
  // { params }: { params: { employeeId: string } }
  { params }: { params: Promise<{ employeeId: string }> }

): Promise<NextResponse> {
  try {
    // const { employeeId } = params;
    const { employeeId } = await params;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get all attendance records for the current month
    const { data: records, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('employeeId', employeeId)
      .gte('date', startOfMonth.toISOString())
      .lte('date', endOfMonth.toISOString());

    if (error) throw error;

    // Calculate summary
    const summary = {
      present: records?.filter((record: AttendanceRecord) => record.status === 'PRESENT').length || 0,
      absent: records?.filter((record: AttendanceRecord) => record.status === 'ABSENT').length || 0,
      late: records?.filter((record: AttendanceRecord) => record.status === 'LATE').length || 0,
      total: records?.length || 0,
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error fetching attendance summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attendance summary' },
      { status: 500 }
    );
  }
}