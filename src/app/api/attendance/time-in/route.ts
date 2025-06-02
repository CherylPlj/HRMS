import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { DateTime } from 'luxon';


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

    
    // Get today's date in Asia/Manila timezone
    const now = DateTime.now().setZone('Asia/Manila');
    const todayStr = now.toFormat('yyyy-MM-dd');
    const timeStr = now.toFormat('HH:mm:ss');
    
    // Set status based on time in
    const lateThreshold = now.set({ hour: 8, minute: 15, second: 0, millisecond: 0 });
    const status = now >= lateThreshold ? 'LATE' : 'PRESENT';


    console.log('Current date in Manila:', todayStr); // Debug log
    console.log('Current time in Manila:', timeStr); // Debug log

    // Check if there's already a record for today
    const { data: existingRecord, error: existingError } = await supabase
      .from('Attendance')
      .select('*')
      .eq('facultyId', facultyId)
      .eq('date', todayStr)
      .single();

    if (existingError && existingError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      throw existingError;
    }

    if (existingRecord?.timeIn) {
      console.log('Time in already recorded for today');
      return NextResponse.json(
        { error: 'Time in already recorded for today' },
        { status: 400 }
      );
    }

    let record;

    if (existingRecord) {
      // Update existing record
      const { data: updatedRecord, error: updateError } = await supabase
        .from('Attendance')
        .update({
          timeIn: timeStr,
          status: 'PRESENT',
          updatedAt: now.toISO()
        })
        .eq('id', existingRecord.id)
        .select()
        .single();

      if (updateError) throw updateError;
      record = updatedRecord;
    } else {
      // Create new record
      const { data: newRecord, error: createError } = await supabase
        .from('Attendance')
        .insert({
          facultyId: parseInt(facultyId),
          date: todayStr,
          timeIn: timeStr,
          // status: 'PRESENT',
          status,
          createdAt: now.toISO(),
          updatedAt: now.toISO()
        })
        .select()
        .single();

      if (createError) throw createError;
      record = newRecord;
    }

    return NextResponse.json({
      id: record.id.toString(),
      facultyId: record.facultyId.toString(),
      // date: DateTime.fromISO(record.date).setZone('Asia/Manila').toFormat('MMMM d, yyyy'),
      date: DateTime.fromISO(record.date).setZone('Asia/Manila').toISO(),
      timeIn: record.timeIn ?? null,
      timeOut: record.timeOut ?? null,
      status: record.status,
      createdAt: new Date(record.createdAt).toISOString(),
      updatedAt: record.updatedAt ? new Date(record.updatedAt).toISOString() : null,
    });
  } catch (error) {
    console.error('Error in time-in route:', error);
    return NextResponse.json(
      { error: 'Failed to record time in' },
      { status: 500 }
    );
  }
}