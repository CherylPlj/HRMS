// app/api/attendance/summary/[facultyId]/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabaseClient';


interface AttendanceRecord {
  id: number;
  facultyId: number;
  date: Date;
  timeIn: Date | null;
  timeOut: Date | null;
  status: string;
  createdAt: Date;
  updatedAt: Date | null;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ facultyId: string }> }
) {
  try {
    const { params } = context;
    // Authenticate the user
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { facultyId } = await params;
    if (!facultyId) {
      return NextResponse.json({ error: 'Faculty ID is required' }, { status: 400 });
    }

    // First get the UserID from Supabase using the email
    const { data: userData, error: userError } = await supabase
      .from('User')
      .select('UserID')
      .eq('UserID', session.userId)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Then verify the faculty record belongs to this user
    const { data: facultyData, error: facultyError } = await supabase
      .from('Faculty')
      .select('FacultyID')
      .eq('UserID', userData.UserID)
      .single();

    if (facultyError || !facultyData || facultyData.FacultyID.toString() !== facultyId) {
      return NextResponse.json({ error: 'Unauthorized access to faculty record' }, { status: 403 });
    }

    // Get current month's start and end dates
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Fetch attendance records for the current month
    const { data: records, error: recordsError } = await supabase
      .from('Attendance')
      .select('*')
      .eq('facultyId', facultyId)
      .gte('date', startOfMonth.toISOString())
      .lte('date', endOfMonth.toISOString());

    if (recordsError) {
      throw recordsError;
    }

    // Calculate summary
    const summary = {
      present: (records as AttendanceRecord[]).filter((r: AttendanceRecord) => r.status === 'PRESENT').length,
      absent: (records as AttendanceRecord[]).filter((r: AttendanceRecord) => r.status === 'ABSENT').length,
      late: (records as AttendanceRecord[]).filter((r: AttendanceRecord) => r.status === 'LATE').length,
      total: records.length,
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error in attendance summary route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attendance summary' },
      { status: 500 }
    );
  }
} 