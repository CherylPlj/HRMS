import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendEmail, generateApplicationConfirmationEmail, generateNewApplicationNotificationEmail } from '@/lib/email';

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
    const MessengerName = formData.get('MessengerName');
    const FBLink = formData.get('FBLink');
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
        FullName,
        Email: Email as string,
        ContactNumber: ContactNumber as string || null,
        Phone: ContactNumber as string || null,
        MessengerName: MessengerName as string || null,
        FBLink: FBLink as string || null,
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

    // Fetch vacancy information for notification email
    let vacancyName = 'Unknown Position';
    try {
      const { data: vacancy, error: vacancyError } = await supabaseAdmin
        .from('Vacancy')
        .select('VacancyName, JobTitle')
        .eq('VacancyID', parseInt(VacancyID as string))
        .single();
      
      if (!vacancyError && vacancy) {
        vacancyName = vacancy.VacancyName || vacancy.JobTitle || 'Unknown Position';
      }
    } catch (error) {
      console.error('Error fetching vacancy information:', error);
    }

    // Send confirmation email to applicant
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

    // Send notification email to sjsfihrms@gmail.com
    try {
      console.log('Preparing to send notification email to sjsfihrms@gmail.com');
      const notificationEmailResult = await sendEmail({
        to: 'sjsfihrms@gmail.com',
        subject: `New Job Application: ${FullName} - ${vacancyName}`,
        html: generateNewApplicationNotificationEmail(
          FullName,
          Email as string,
          ContactNumber as string | null,
          MessengerName as string | null,
          FBLink as string | null,
          vacancyName,
          candidate.DateApplied || new Date().toISOString()
        ),
      });
      
      if (notificationEmailResult.success) {
        console.log('Notification email sent successfully to sjsfihrms@gmail.com');
      } else {
        console.error('Failed to send notification email:', notificationEmailResult.error);
      }
    } catch (notificationError) {
      console.error('Error sending notification email:', notificationError);
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