import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuth } from '@clerk/nextjs/server';
import { googleDriveService } from '@/services/googleDriveService';
import { sendEmail, generateStatusUpdateEmail, generateInterviewScheduleEmail } from '@/lib/email';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = await params.id;
  try {
    const { data: candidate, error } = await supabaseAdmin
      .from('Candidate')
      .select(`
        *,
        Vacancy (
          VacancyID,
          VacancyName,
          JobTitle,
          HiringManager
        )
      `)
      .eq('CandidateID', parseInt(id))
      .eq('isDeleted', false)
      .single();

    if (error) {
      console.error('Error fetching candidate:', error);
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(candidate);
  } catch (error) {
    console.error('Error fetching candidate:', error);
    return NextResponse.json(
      { error: 'Failed to fetch candidate' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Ensure params.id exists
    if (!params?.id) {
      return NextResponse.json(
        { error: 'Candidate ID is required' },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    
    // Extract all the fields from formData
    const LastName = formData.get('LastName') as string;
    const FirstName = formData.get('FirstName') as string;
    const MiddleName = formData.get('MiddleName') as string;
    const ExtensionName = formData.get('ExtensionName') as string;
    const FullName = formData.get('FullName') as string;
    const Email = formData.get('Email') as string;
    const ContactNumber = formData.get('ContactNumber') as string;
    const DateOfBirth = formData.get('DateOfBirth') as string;
    const InterviewDate = formData.get('InterviewDate') as string;
    const Status = formData.get('Status') as string;
    const resume = formData.get('resume') as File | null;
    const Sex = formData.get('Sex') as string;
    const VacancyID = formData.get('VacancyID') as string;

    // Validate required fields
    if (!LastName || !FirstName || !Email || !Status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get the current candidate data to check if status is being changed
    const { data: currentCandidate } = await supabaseAdmin
      .from('Candidate')
      .select('Status, Vacancy (VacancyName)')
      .eq('CandidateID', params.id)
      .single();

    // Get the vacancy name for email notifications
    const { data: vacancy } = await supabaseAdmin
      .from('Vacancy')
      .select('VacancyName')
      .eq('VacancyID', VacancyID)
      .single();

    const vacancyName = vacancy?.VacancyName || '';

    // Prepare update data
    const updateData: any = {
      LastName,
      FirstName,
      MiddleName: MiddleName || null,
      ExtensionName: ExtensionName || null,
      FullName,
      Email,
      ContactNumber: ContactNumber || null,
      Sex: Sex || null,
      DateOfBirth: DateOfBirth ? new Date(DateOfBirth).toISOString() : null,
      InterviewDate: InterviewDate || null,
      Status,
      Phone: ContactNumber || null,
      DateModified: new Date().toISOString()
    };

    // Handle resume upload if provided
    if (resume) {
      try {
        const timestamp = Date.now();
        const fileName = `${timestamp}-${resume.name}`;
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from('resumes')
          .upload(fileName, resume);

        if (uploadError) {
          console.error('Error uploading resume:', uploadError);
          return NextResponse.json(
            { error: 'Failed to upload resume' },
            { status: 500 }
          );
        }

        // Get the public URL for the uploaded file
        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('resumes')
          .getPublicUrl(fileName);

        updateData.Resume = fileName;
        updateData.ResumeUrl = publicUrl;
      } catch (uploadError) {
        console.error('Error handling resume upload:', uploadError);
        return NextResponse.json(
          { error: 'Failed to process resume upload' },
          { status: 500 }
        );
      }
    }

    // Update candidate in the database
    const { data: candidate, error } = await supabaseAdmin
      .from('Candidate')
      .update(updateData)
      .eq('CandidateID', params.id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating candidate:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to update candidate in database' },
        { status: 500 }
      );
    }

    if (!candidate) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 }
      );
    }

    // Send email notifications for status changes
    if (Status !== currentCandidate?.Status) {
      try {
        // For interview scheduled status, send the interview schedule email
        if (Status === 'InterviewScheduled' && InterviewDate) {
          const formattedInterviewDate = new Date(InterviewDate).toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true,
            timeZone: 'Asia/Manila'
          });

          await sendEmail({
            to: Email,
            subject: 'Interview Schedule - Saint Joseph School of Fairview Inc.',
            html: generateInterviewScheduleEmail(FullName, vacancyName, formattedInterviewDate)
          });
        } 
        // For all other status changes, send the status update email
        else {
          await sendEmail({
            to: Email,
            subject: 'Application Status Update - Saint Joseph School of Fairview Inc.',
            html: generateStatusUpdateEmail(FullName, vacancyName, Status)
          });
        }
      } catch (emailError) {
        console.error('Error sending status update email:', emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json(candidate);
  } catch (error) {
    console.error('Error in PATCH /api/candidates/[id]:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = await params.id;
  try {
    const { userId } = getAuth(req) || {};
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Soft delete the candidate
    const { data: candidate, error } = await supabaseAdmin
      .from('Candidate')
      .update({
        isDeleted: true,
        updatedBy: userId
      })
      .eq('CandidateID', parseInt(id))
      .select()
      .single();

    if (error) {
      console.error('Error deleting candidate:', error);
      return NextResponse.json(
        { error: 'Failed to delete candidate' },
        { status: 500 }
      );
    }

    return NextResponse.json(candidate);
  } catch (error) {
    console.error('Error deleting candidate:', error);
    return NextResponse.json(
      { error: 'Failed to delete candidate' },
      { status: 500 }
    );
  }
} 