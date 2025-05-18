import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  try {
    const { employeeId } = await request.json();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Find today's attendance record
    const { data: existingRecord } = await supabase
      .from('attendance')
      .select('*')
      .eq('employeeId', employeeId)
      .gte('date', today.toISOString())
      .lt('date', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString())
      .single();

    if (!existingRecord) {
      return NextResponse.json(
        { error: 'No time-in record found for today' },
        { status: 404 }
      );
    }

    // Update the record with time out
    const { data: attendance, error } = await supabase
      .from('attendance')
      .update({ timeOut: now.toISOString() })
      .eq('id', existingRecord.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(attendance);
  } catch (error) {
    console.error('Error in time-out:', error);
    return NextResponse.json(
      { error: 'Failed to mark time out' },
      { status: 500 }
    );
  }
} 