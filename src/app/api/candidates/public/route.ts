import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { googleDriveService } from '@/services/googleDriveService';
import { sendEmail, generateApplicationConfirmationEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const VacancyID = formData.get('VacancyID');
    const LastName = formData.get('LastName');
    const FirstName = formData.get('FirstName');
    const MiddleName = formData.get('MiddleName');
    const ExtensionName = formData.get('ExtensionName');
    const Email = formData.get('Email');
    const ContactNumber = formData.get('ContactNumber');
    const Sex = formData.get('Sex');
    const DateOfBirth = formData.get('DateOfBirth');
    const resume = formData.get('resume') as File | null;

    // Validate required fields
    if (!VacancyID || !LastName || !FirstName || !Email || !Sex || !DateOfBirth) {
      return NextResponse.json(
        { error: 'Missing required fields: VacancyID, LastName, FirstName, Email, Sex, and DateOfBirth are required' },
        { status: 400 }
      );
    }

    // Validate Sex field
    if (!['Male', 'Female'].includes(Sex as string)) {
      return NextResponse.json(
        { error: 'Sex must be either Male or Female' },
        { status: 400 }
      );
    }

    // Validate age (18-65)
    const dob = new Date(DateOfBirth as string);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    if (age < 18 || age > 65) {
      return NextResponse.json(
        { error: 'Age must be between 18 and 65 years old' },
        { status: 400 }
      );
    }

    // Generate FullName
    const FullName = [LastName, FirstName, MiddleName, ExtensionName]
      .filter(Boolean)
      .join(' ')
      .trim();

    // Handle resume file if provided
    let Resume = null;
    let ResumeUrl = null;
    if (resume) {
      try {
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
        LastName: LastName as string,
        FirstName: FirstName as string,
        MiddleName: MiddleName as string || null,
        ExtensionName: ExtensionName as string || null,
        FullName,
        Email: Email as string,
        ContactNumber: ContactNumber as string || null,
        Phone: ContactNumber as string || null,
        Sex: Sex as string,
        DateOfBirth: new Date(DateOfBirth as string).toISOString(),
        Status: 'ApplicationInitiated',
        Resume,
        ResumeUrl,
        DateModified: new Date().toISOString(),
        createdBy: 'public_application'
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

    // Send confirmation email
    try {
      console.log('Preparing to send confirmation email to:', Email);
      const emailResult = await sendEmail({
        to: Email as string,
        subject: 'Application Received - Saint Joseph School of Fairview Inc.',
        html: generateApplicationConfirmationEmail(FullName),
      });
      
      if (emailResult.success) {
        console.log('Confirmation email sent successfully');
      } else {
        console.error('Failed to send confirmation email:', emailResult.error);
      }
    } catch (emailError) {
      console.error('Error in email sending process:', emailError);
      // Don't fail the request if email fails, just log it
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