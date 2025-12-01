import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = await params.token;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Fetch candidate by token
    const { data: candidate, error } = await supabaseAdmin
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
        Token,
        TokenExpiry,
        EmployeeInfoSubmitted,
        EmployeeInfoSubmittedDate,
        SubmittedEmployeeInfo,
        InfoReturned,
        InfoReturnedDate,
        InfoReturnReason,
        Vacancy (
          VacancyID,
          VacancyName,
          JobTitle
        )
      `)
      .eq('Token', token)
      .eq('isDeleted', false)
      .single();

    if (error || !candidate) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 404 }
      );
    }

    // Check if token has expired
    if (candidate.TokenExpiry) {
      const expiryDate = new Date(candidate.TokenExpiry);
      const now = new Date();
      
      if (now > expiryDate) {
        return NextResponse.json(
          { error: 'Token has expired. Please contact HR for a new link.' },
          { status: 400 }
        );
      }
    }

    // Check if status is "Offered"
    if (candidate.Status !== 'Offered') {
      return NextResponse.json(
        { error: 'This link is no longer valid for your current application status.' },
        { status: 400 }
      );
    }

    // Return candidate data (excluding sensitive fields)
    return NextResponse.json({
      candidate: {
        CandidateID: candidate.CandidateID,
        FullName: candidate.FullName,
        Email: candidate.Email,
        ContactNumber: candidate.ContactNumber,
        Sex: candidate.Sex,
        DateOfBirth: candidate.DateOfBirth,
        Vacancy: candidate.Vacancy,
        EmployeeInfoSubmitted: candidate.EmployeeInfoSubmitted,
        SubmittedEmployeeInfo: candidate.SubmittedEmployeeInfo,
        InfoReturned: candidate.InfoReturned,
        InfoReturnedDate: candidate.InfoReturnedDate,
        InfoReturnReason: candidate.InfoReturnReason
      }
    });
  } catch (error) {
    console.error('Error validating token:', error);
    return NextResponse.json(
      { error: 'Failed to validate token' },
      { status: 500 }
    );
  }
}

