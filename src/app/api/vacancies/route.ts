import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuth } from '@clerk/nextjs/server';

export async function GET() {
  try {
    const { data: vacancies, error } = await supabaseAdmin
      .from('Vacancy')
      .select(`
        *,
        Candidate(count)
      `)
      .eq('isDeleted', false)
      .order('DateCreated', { ascending: false });

    if (error) {
      console.error('Error fetching vacancies:', error);
      return NextResponse.json(
        { error: 'Failed to fetch vacancies' },
        { status: 500 }
      );
    }

    return NextResponse.json(vacancies);
  } catch (error) {
    console.error('Error fetching vacancies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vacancies' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req) || {};
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data = await req.json();
    const { JobTitle, VacancyName, Description, HiringManager, Status, DatePosted } = data;

    // Validate required fields
    if (!JobTitle || !VacancyName || !HiringManager) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data: vacancy, error } = await supabaseAdmin
      .from('Vacancy')
      .insert([{
        JobTitle,
        VacancyName,
        Description,
        HiringManager,
        Status: Status || 'Active',
        DatePosted: DatePosted ? new Date(DatePosted).toISOString() : null,
        DateModified: new Date().toISOString(),
        createdBy: userId
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating vacancy:', error);
      return NextResponse.json(
        { error: 'Failed to create vacancy' },
        { status: 500 }
      );
    }

    return NextResponse.json(vacancy);
  } catch (error) {
    console.error('Error creating vacancy:', error);
    return NextResponse.json(
      { error: 'Failed to create vacancy' },
      { status: 500 }
    );
  }
} 