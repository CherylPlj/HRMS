import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

type AttendanceRecord = {
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'NOT_RECORDED';
};

export async function GET(
  request: NextRequest,
  // { params }: { params: { EmployeeId: string } }
  { params }: { params: Promise<{ EmployeeId: string }> }

): Promise<NextResponse> {
  try {
    // const { EmployeeId } = params;
    const { EmployeeId } = await params;
    const now = new Date();
    const StartOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const EndOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get all attendance records for the current month
    const { data: records, error } = await supabase
      .from('Attendance')
      .select('*')
      .eq('employeeId', EmployeeId)
      .gte('date', StartOfMonth.toISOString())
      .lte('date', EndOfMonth.toISOString());

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