import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuth } from '@clerk/nextjs/server';
import { validateResumeFile, FILE_SIZE_LIMITS } from '@/lib/fileValidation';
// import { streamToBuffer } from '@/lib/utils';

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
    const LastName = formData.get('LastName');
    const FirstName = formData.get('FirstName');
    const MiddleName = formData.get('MiddleName');
    const ExtensionName = formData.get('ExtensionName');
    const Email = formData.get('Email');
    const ContactNumber = formData.get('ContactNumber');
    const DateOfBirth = formData.get('DateOfBirth');
    const Phone = formData.get('Phone'); // For backward compatibility
    const InterviewDate = formData.get('InterviewDate');
    const Status = formData.get('Status');
    const resume = formData.get('resume') as File | null;
    const Sex = formData.get('Sex') as string;

    // Generate FullName from component parts
    const FullName = [LastName, FirstName, MiddleName, ExtensionName]
      .filter(Boolean)
      .join(' ')
      .trim();

    // Validate required fields
    if (!VacancyID || !LastName || !FirstName || !Email) {
      return NextResponse.json(
        { error: 'Missing required fields: VacancyID, LastName, FirstName, and Email are required' },
        { status: 400 }
      );
    }

    if (Sex && !['Male', 'Female', 'Intersex'].includes(Sex)) {
      return NextResponse.json(
        { error: 'Invalid value for Sex' },
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
      // Validate resume file
      const fileValidation = validateResumeFile(resume, false);
      if (!fileValidation.valid) {
        return NextResponse.json(
          { error: fileValidation.error },
          { status: 400 }
        );
      }

      // Additional security check: verify file size
      if (resume.size > FILE_SIZE_LIMITS.RESUME) {
        return NextResponse.json(
          { error: `Resume file size exceeds maximum limit of ${FILE_SIZE_LIMITS.RESUME / (1024 * 1024)}MB` },
          { status: 400 }
        );
      }

      try {
        // Upload file to Supabase Storage
        const fileName = `${Date.now()}_${resume.name}`;
        console.log('Uploading file to Supabase Storage:', {
          fileName,
          mimeType: resume.type,
        });

        // Convert File to buffer
        const buffer = await resume.arrayBuffer();
        const fileBuffer = Buffer.from(buffer);

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from('resumes')
          .upload(fileName, fileBuffer, {
            contentType: resume.type,
            upsert: false
          });

        if (uploadError) {
          console.error('Error uploading resume to Supabase:', uploadError);
          // Continue without the resume if upload fails
        } else {
          // Get the public URL for the uploaded file
          const { data: { publicUrl } } = supabaseAdmin.storage
            .from('resumes')
            .getPublicUrl(fileName);

          Resume = uploadData.path;
          ResumeUrl = publicUrl;
          console.log('File uploaded successfully to Supabase Storage:', {
            path: uploadData.path,
            publicUrl
          });
        }
      } catch (error) {
        console.error('Error uploading resume:', error);
        // Continue without the resume if upload fails
      }
    }

    const { data: candidate, error } = await supabaseAdmin
      .from('Candidate')
      .insert([{
        VacancyID: parseInt(VacancyID as string),
        LastName: LastName as string,
        FirstName: FirstName as string,
        MiddleName: MiddleName as string || null,
        ExtensionName: ExtensionName as string || null,
        FullName: FullName as string,
        Email: Email as string,
        ContactNumber: ContactNumber as string || null,
        DateOfBirth: DateOfBirth ? new Date(DateOfBirth as string).toISOString() : null,
        Phone: ContactNumber as string || null, // Use ContactNumber for Phone field too
        InterviewDate: InterviewDate as string || null, // Store as is without conversion
        Status: finalStatus,
        Resume,
        ResumeUrl,
        Sex: Sex || null,
        DateModified: new Date().toISOString(),
        createdBy: userId
      }])
      .select(`
        *,
        Vacancy (
          VacancyID,
          VacancyName,
          JobTitle,
          HiringManager
        )
      `)
      .single();

    if (error) {
      console.error('Error creating candidate:', error);
      // If candidate creation fails, delete the uploaded file from Supabase Storage
      if (Resume) {
        try {
          await supabaseAdmin.storage
            .from('resumes')
            .remove([Resume]);
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