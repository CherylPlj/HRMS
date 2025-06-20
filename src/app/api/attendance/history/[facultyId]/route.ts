import { NextResponse } from 'next/server';
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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const { facultyId } = await params;
    if (!facultyId) {
      return NextResponse.json(
        { error: 'Faculty ID is required' },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse and format dates for query
    const start = DateTime.fromISO(startDate).setZone('Asia/Manila').toFormat('yyyy-MM-dd');
    const end = DateTime.fromISO(endDate).setZone('Asia/Manila').toFormat('yyyy-MM-dd');

    console.log('Fetching attendance records from', start, 'to', end); // Debug log

    // Fetch attendance records from Supabase
    const { data: records, error: recordsError } = await supabase
      .from('Attendance')
      .select('*')
      .eq('facultyId', facultyId)
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false });

    if (recordsError) {
      throw recordsError;
    }

    console.log('Found records:', records); // Debug log

    // Format the response
    // eslint-disable-line @typescript-eslint/no-explicit-any
    const formattedRecords = records.map((record: any) => {
      const date = DateTime.fromISO(record.date).setZone('Asia/Manila');
      const timeIn = record.timeIn ? DateTime.fromFormat(record.timeIn, 'HH:mm:ss').setZone('Asia/Manila') : null;
      const timeOut = record.timeOut ? DateTime.fromFormat(record.timeOut, 'HH:mm:ss').setZone('Asia/Manila') : null;

      return {
        id: record.id.toString(),
        facultyId: record.facultyId.toString(),
        date: date.toISODate(),
        formattedDate: date.toFormat('MMMM d, yyyy'),
        timeIn: timeIn ? timeIn.toFormat('HH:mm:ss') : null,
        timeOut: timeOut ? timeOut.toFormat('HH:mm:ss') : null,
        status: record.status,
        createdAt: DateTime.fromISO(record.createdAt).setZone('Asia/Manila').toISO(),
        updatedAt: record.updatedAt ? DateTime.fromISO(record.updatedAt).setZone('Asia/Manila').toISO() : null,
      };
    });

    console.log('Formatted records:', formattedRecords); // Debug log

    return NextResponse.json(formattedRecords, {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in attendance history route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attendance history' },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 