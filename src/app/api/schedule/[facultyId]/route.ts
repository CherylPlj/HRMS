import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabaseClient';
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
interface Schedule {
    ScheduleID: number;
    FacultyID: number;
    StartTime: Date;
    EndTime: Date;
  Subject: string;
  ClassSection: string;
  DayOfWeek: string;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ FacultyID: string }> }
) {
  try {
    const { params } = context;
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { FacultyID } = await params;
    if (!FacultyID) {
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

    if (facultyError || !facultyData || facultyData.FacultyID.toString() !== FacultyID) {
      return NextResponse.json({ error: 'Unauthorized access to faculty record' }, { status: 403 });
    }

    // Fetch schedule records from Supabase
    const { data: schedules, error: schedulesError } = await supabase
      .from('Schedule')
      .select('*')
      .eq('FacultyID', FacultyID)
      .order('DayOfWeek', { ascending: true });

    if (schedulesError) {
      throw schedulesError;
    }

    // Format the response
    const formattedSchedules = schedules.map((schedule: any) => ({
      id: schedule.ScheduleID.toString(),
      name: schedule.Subject,
      subject: schedule.Subject,
      classSection: schedule.ClassSection,
      day: schedule.DayOfWeek,
      timeIn: new Date(schedule.StartTime).toLocaleTimeString(),
      timeOut: new Date(schedule.EndTime).toLocaleTimeString(),
      status: 'ACTIVE',
    }));

    return NextResponse.json(formattedSchedules);
  } catch (error) {
    console.error('Error in schedule route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedule' },
      { status: 500 }
    );
  }
} 