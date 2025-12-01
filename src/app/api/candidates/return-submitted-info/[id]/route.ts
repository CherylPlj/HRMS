import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendEmail, generateReturnedInfoEmail } from '@/lib/email';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { reason } = body;

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: 'Return reason is required' },
        { status: 400 }
      );
    }

    // Fetch candidate data
    const { data: candidate, error: candidateError } = await supabaseAdmin
      .from('Candidate')
      .select(`
        CandidateID,
        LastName,
        FirstName,
        FullName,
        Email,
        Token,
        TokenExpiry,
        Vacancy (
          VacancyID,
          VacancyName,
          JobTitle
        )
      `)
      .eq('CandidateID', parseInt(id))
      .eq('isDeleted', false)
      .single();

    if (candidateError || !candidate) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 }
      );
    }

    // Update candidate to mark info as returned
    const { data: updatedCandidate, error: updateError } = await supabaseAdmin
      .from('Candidate')
      .update({
        InfoReturned: true,
        InfoReturnedDate: new Date().toISOString(),
        InfoReturnReason: reason.trim(),
        EmployeeInfoSubmitted: false, // Allow resubmission
        DateModified: new Date().toISOString()
      })
      .eq('CandidateID', parseInt(id))
      .select()
      .single();

    if (updateError) {
      console.error('Error updating candidate:', updateError);
      return NextResponse.json(
        { error: 'Failed to return submitted information' },
        { status: 500 }
      );
    }

    // Send email to candidate with return reason and edit link
    if (candidate.Token && candidate.Email) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}` 
          : 'http://localhost:3000');
        const editLink = `${baseUrl}/offered-applicant/${candidate.Token}`;
        
        await sendEmail({
          to: candidate.Email,
          subject: 'Employee Information Returned - Action Required',
          html: generateReturnedInfoEmail(
            candidate.FullName,
            candidate.Vacancy?.VacancyName || '',
            reason,
            editLink
          )
        });
      } catch (emailError) {
        console.error('Error sending return email:', emailError);
        // Don't fail the request if email fails, but log it
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Submitted information has been returned. Email sent to candidate.',
      candidate: updatedCandidate
    });
  } catch (error) {
    console.error('Error in return-submitted-info:', error);
    return NextResponse.json(
      { error: 'Failed to return submitted information' },
      { status: 500 }
    );
  }
}

