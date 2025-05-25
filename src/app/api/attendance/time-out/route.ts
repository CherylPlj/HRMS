import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  try {
    const { employeeId } = await request.json();
    console.log('Received time-out request for employee:', employeeId);
    
    if (!employeeId) {
      console.error('Employee ID is missing');
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      );
    }

    // Get current time in UTC
    const now = new Date();
    
    // Convert to Philippines time (UTC+8)
    const phTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    const today = new Date(phTime.getFullYear(), phTime.getMonth(), phTime.getDate());

    console.log('Current UTC time:', now.toISOString());
    console.log('Philippines time:', phTime.toISOString());
    console.log('Checking for existing record on:', today.toISOString());

    // Find today's attendance record
    const { data: existingRecord, error: fetchError } = await supabase
      .from('Attendance')
      .select('*')
      .eq('employeeId', employeeId)
      .gte('date', today.toISOString())
      .lt('date', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString())
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        console.log('No time-in record found for today');
        return NextResponse.json(
          { error: 'No time-in record found for today' },
          { status: 404 }
        );
      }
      console.error('Error fetching existing record:', fetchError);
      return NextResponse.json(
        { error: `Error checking existing record: ${fetchError.message}` },
        { status: 500 }
      );
    }

    if (!existingRecord?.timeIn) {
      console.log('Time in not recorded for today');
      return NextResponse.json(
        { error: 'Time in not recorded for today' },
        { status: 400 }
      );
    }

    if (existingRecord.timeOut) {
      console.log('Time out already recorded for today');
      return NextResponse.json(
        { error: 'Time out already recorded for today' },
        { status: 400 }
      );
    }

    // Update the record with time out
    console.log('Updating attendance record with time out');
    const { data: attendance, error: updateError } = await supabase
      .from('Attendance')
      .update({ 
        timeOut: phTime.toISOString(),
        updatedAt: now.toISOString()
      })
      .eq('id', existingRecord.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating attendance record:', updateError);
      return NextResponse.json(
        { error: `Error updating attendance record: ${updateError.message}` },
        { status: 500 }
      );
    }

    console.log('Successfully updated attendance record:', attendance);
    return NextResponse.json(attendance);
  } catch (error) {
    console.error('Unexpected error in time-out:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to mark time out' },
      { status: 500 }
    );
  }
} 