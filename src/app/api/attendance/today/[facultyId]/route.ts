import { NextResponse } from 'next/server';
// import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabaseClient';
import { DateTime } from 'luxon';
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const { facultyId } = await params;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!facultyId) {
      return NextResponse.json(
        { error: 'Faculty ID is required' },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // First get the UserID from Supabase using the email
    const { data: userData, error: userError } = await supabase
      .from('User')
      .select('UserID')
      .eq('Email', email)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Then verify the faculty record belongs to this user
    const { data: facultyData, error: facultyError } = await supabase
      .from('Faculty')
      .select('FacultyID')
      .eq('UserID', userData.UserID)
      .single();

    if (facultyError || !facultyData || facultyData.FacultyID.toString() !== facultyId) {
      return NextResponse.json(
        { error: 'Unauthorized access to faculty record' },
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get today's date in Asia/Manila timezone
    const now = DateTime.now().setZone('Asia/Manila');
    const todayStr = now.toFormat('yyyy-MM-dd');

    console.log('Fetching attendance for date:', todayStr); // Debug log

    // Fetch today's attendance record
    const { data: record, error: recordError } = await supabase
      .from('Attendance')
      .select('*')
      .eq('facultyId', facultyId)
      .eq('date', todayStr)
      .single();

    console.log('Query result:', { record, error: recordError }); // Debug log

    if (recordError && recordError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      throw recordError;
    }

    if (!record) {
      return NextResponse.json(null, {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Format the response
    const formattedRecord = {
      id: record.id.toString(),
      facultyId: record.facultyId.toString(),
      date: DateTime.fromISO(record.date).setZone('Asia/Manila').toISO(),
      timeIn: record.timeIn ?? null,
      timeOut: record.timeOut ?? null,
      status: record.status,
      createdAt: new Date(record.createdAt).toISOString(),
      updatedAt: record.updatedAt ? new Date(record.updatedAt).toISOString() : null,
    };

    console.log('Formatted record:', formattedRecord); // Debug log

    return NextResponse.json(formattedRecord, {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in today\'s attendance route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch today\'s attendance record' },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 