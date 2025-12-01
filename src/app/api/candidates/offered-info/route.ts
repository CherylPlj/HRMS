import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuth } from '@clerk/nextjs/server';

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const { userId } = getAuth(req) || {};
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch all candidates with submitted employee information
    const { data: candidates, error } = await supabaseAdmin
      .from('Candidate')
      .select(`
        CandidateID,
        VacancyID,
        LastName,
        FirstName,
        MiddleName,
        ExtensionName,
        FullName,
        Email,
        ContactNumber,
        Sex,
        DateOfBirth,
        Phone,
        Status,
        DateApplied,
        EmployeeInfoSubmitted,
        EmployeeInfoSubmittedDate,
        SubmittedEmployeeInfo,
        Vacancy (
          VacancyID,
          VacancyName,
          JobTitle
        )
      `)
      .eq('EmployeeInfoSubmitted', true)
      .eq('Status', 'Offered')
      .eq('isDeleted', false)
      .order('EmployeeInfoSubmittedDate', { ascending: false });

    if (error) {
      console.error('Error fetching candidates with submitted info:', error);
      return NextResponse.json(
        { error: 'Failed to fetch candidates' },
        { status: 500 }
      );
    }

    return NextResponse.json({ candidates: candidates || [] });
  } catch (error) {
    console.error('Error in GET /api/candidates/offered-info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch candidates' },
      { status: 500 }
    );
  }
}

