import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuth } from '@clerk/nextjs/server';
import { googleDriveService } from '@/services/googleDriveService';

export async function GET() {
  try {
    const { data: candidates, error } = await supabaseAdmin
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
      .eq('isDeleted', false)
      .order('DateCreated', { ascending: false });

    if (error) {
      console.error('Error fetching candidates:', error);
      return NextResponse.json(
        { error: 'Failed to fetch candidates' },
        { status: 500 }
      );
    }

    return NextResponse.json(candidates);
  } catch (error) {
    console.error('Error fetching candidates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch candidates' },
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

    const formData = await req.formData();
    const VacancyID = formData.get('VacancyID');
    const FullName = formData.get('FullName');
    const Email = formData.get('Email');
    const Phone = formData.get('Phone');
    const InterviewDate = formData.get('InterviewDate');
    const Status = formData.get('Status');
    const resume = formData.get('resume') as File | null;

    // Validate required fields
    if (!VacancyID || !FullName || !Email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Auto-set status to InterviewScheduled if interview date is provided
    let finalStatus = Status as string || 'ApplicationInitiated';
    if (InterviewDate && InterviewDate.toString().trim() !== '') {
      finalStatus = 'InterviewScheduled';
    }

    // Handle resume file if provided
    let Resume = null;
    let ResumeUrl = null;
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
      } catch (error) {
        console.error('Error uploading resume:', error);
        // Continue without the resume if upload fails
      }
    }

    const { data: candidate, error } = await supabaseAdmin
      .from('Candidate')
      .insert([{
        VacancyID: parseInt(VacancyID as string),
        FullName: FullName as string,
        Email: Email as string,
        Phone: Phone as string || null,
        InterviewDate: InterviewDate ? new Date(InterviewDate as string).toISOString() : null,
        Status: finalStatus,
        Resume,
        ResumeUrl,
        DateModified: new Date().toISOString(),
        createdBy: userId
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating candidate:', error);
      // If candidate creation fails, delete the uploaded file from Google Drive
      if (Resume) {
        try {
          await googleDriveService.deleteFile(Resume);
        } catch (deleteError) {
          console.error('Error deleting uploaded file:', deleteError);
        }
      }
      return NextResponse.json(
        { error: 'Failed to create candidate' },
        { status: 500 }
      );
    }

    return NextResponse.json(candidate);
  } catch (error) {
    console.error('Error creating candidate:', error);
    return NextResponse.json(
      { error: 'Failed to create candidate' },
      { status: 500 }
    );
  }
} 