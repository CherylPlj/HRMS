import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import {DateTime} from 'luxon';

export async function POST(request: Request) {
  try {
    const { email, facultyId } = await request.json();
    if (!email || !facultyId) {
      return NextResponse.json({ error: 'Email and Faculty ID are required' }, { status: 400 });
    }

    // First get the UserID from Supabase using the email
    const { data: userData, error: userError } = await supabase
      .from('User')
      .select('UserID')
      .eq('Email', email)
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

    // const today = new Date();
    // today.setHours(0, 0, 0, 0);
    // Get today's date in Asia/Manila timezone
    const now = DateTime.now().setZone('Asia/Manila');
    const todayStr = now.toFormat('yyyy-MM-dd');
    const timeStr = now.toFormat('HH:mm:ss');
    console.log('Current date in Manila:', todayStr); // Debug log
    console.log('Current time in Manila:', timeStr); // Debug log

    // Check if there's a record for today
    const { data: existingRecord, error: existingError } = await supabase
      .from('Attendance')
      .select('*')
      .eq('facultyId',  parseInt(facultyId))
      .eq('date', todayStr)
      .maybeSingle();
    if (existingError && existingError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      throw existingError;
    }

    if (!existingRecord) {
      return NextResponse.json(
        { error: 'No time-in record found for today' },
        { status: 400 }
      );
    }

    if (existingRecord.timeOut) {
      return NextResponse.json(
        { error: 'Time out already recorded for today' },
        { status: 400 }
      );
    }

    // const now = new Date();
    // Update attendance record
    const { data: record, error: updateError } = await supabase
      .from('Attendance')
      .update({
        timeOut: timeStr,
        updatedAt: now.toISO()
      })
      // .eq('id', existingRecord.id)
      .eq('facultyId', Number(facultyId))
      .eq('date', todayStr)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      id: record.id.toString(),
      facultyId: record.facultyId.toString(),
      //date: new Date(record.date).toISOString(),
      // date: DateTime.fromISO(record.date).setZone('Asia/Manila').toFormat('MMMM d, yyyy'),
      date: DateTime.fromISO(record.date).setZone('Asia/Manila').toISO(),
      timeIn: record.timeIn ?? null,
      timeOut: record.timeOut ?? null,
      status: record.status,
      createdAt: new Date(record.createdAt).toISOString(),
      updatedAt: record.updatedAt ? new Date(record.updatedAt).toISOString() : null,
    });
  } catch (error) {
    console.error('Error in time-out route:', error);
    return NextResponse.json(
      { error: 'Failed to record time out' },
      { status: 500 }
    );
  }
} 