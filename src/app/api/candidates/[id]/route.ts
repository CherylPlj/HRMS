import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuth } from '@clerk/nextjs/server';
import { googleDriveService } from '@/services/googleDriveService';

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
  const id = await params.id;
  try {
    const { userId } = getAuth(req) || {};
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const FullName = formData.get('FullName');
    const Email = formData.get('Email');
    const Phone = formData.get('Phone');
    const InterviewDate = formData.get('InterviewDate');
    const Status = formData.get('Status');
    const resume = formData.get('resume') as File | null;

    // Validate required fields
    if (!FullName || !Email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Auto-set status to InterviewScheduled if interview date is provided
    let finalStatus = Status as string;
    if (InterviewDate && InterviewDate.toString().trim() !== '') {
      finalStatus = 'InterviewScheduled';
    }

    // Handle resume file if provided
    let Resume = undefined;
    let ResumeUrl = undefined;
    if (resume) {
      try {
        // Upload file to Google Drive using the same approach as faculty-documents
        const fileName = `${Date.now()}_${resume.name}`;
        console.log('Uploading resume to Google Drive:', {
          fileName,
          fileType: resume.type,
          folderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
        });

        const uploadResult = await googleDriveService.uploadFile(
          resume,
          fileName,
          resume.type,
          process.env.GOOGLE_DRIVE_FOLDER_ID
        );

        console.log('File upload successful:', uploadResult);
        
        Resume = uploadResult.fileId;
        ResumeUrl = uploadResult.webViewLink;

        // Delete old resume if it exists
        const { data: existingCandidate } = await supabaseAdmin
          .from('Candidate')
          .select('Resume')
          .eq('CandidateID', parseInt(id))
          .single();

        if (existingCandidate?.Resume) {
          try {
            // Determine storage type based on file ID format
            // Google Drive IDs are typically long alphanumeric strings
            // Supabase Storage paths contain slashes and are typically shorter
            const isGoogleDriveId = existingCandidate.Resume.length > 20 && !existingCandidate.Resume.includes('/');
            const storageType = isGoogleDriveId ? 'google-drive' : 'supabase';
            
            await googleDriveService.deleteFile(existingCandidate.Resume, storageType);
            console.log('Deleted old resume from storage:', existingCandidate.Resume, 'Storage type:', storageType);
          } catch (deleteError) {
            console.error('Error deleting old resume:', deleteError);
            // Continue even if delete fails - this is not critical
          }
        }
      } catch (error) {
        console.error('Error uploading resume:', error);
        // Continue without the resume if upload fails
      }
    }

    const { data: candidate, error } = await supabaseAdmin
      .from('Candidate')
      .update({
        FullName: FullName as string,
        Email: Email as string,
        Phone: Phone as string || null,
        InterviewDate: InterviewDate ? new Date(InterviewDate as string).toISOString() : null,
        Status: finalStatus,
        ...(Resume && { Resume }),
        ...(ResumeUrl && { ResumeUrl }),
        DateModified: new Date().toISOString(),
        updatedBy: userId
      })
      .eq('CandidateID', parseInt(id))
      .select()
      .single();

    if (error) {
      console.error('Error updating candidate:', error);
      // If candidate update fails, delete the uploaded file from Google Drive
      if (Resume) {
        try {
          await googleDriveService.deleteFile(Resume);
        } catch (deleteError) {
          console.error('Error deleting uploaded file:', deleteError);
        }
      }
      return NextResponse.json(
        { error: 'Failed to update candidate' },
        { status: 500 }
      );
    }

    return NextResponse.json(candidate);
  } catch (error) {
    console.error('Error updating candidate:', error);
    return NextResponse.json(
      { error: 'Failed to update candidate' },
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