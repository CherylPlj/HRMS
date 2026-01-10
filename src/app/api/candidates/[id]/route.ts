import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuth } from '@clerk/nextjs/server';
import { sendEmail, generateStatusUpdateEmail, generateInterviewScheduleEmail, formatNameForEmail } from '@/lib/email';
import crypto from 'crypto';
import { createClerkClient } from '@clerk/clerk-sdk-node';
import { generateUserId } from '@/lib/generateUserId';

// Initialize Clerk client
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

// Helper function to generate a secure temporary password
function generateTemporaryPassword(): string {
  const length = 12;
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  const allChars = uppercase + lowercase + numbers + symbols;
  
  let password = '';
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Helper function to create User and Clerk account for hired employees
async function createUserAccountForHiredEmployee(
  candidateEmail: string,
  firstName: string,
  lastName: string,
  candidateId: number
): Promise<{ success: boolean; userId?: string; temporaryPassword?: string; error?: string }> {
  try {
    console.log('Creating user account for hired employee:', candidateEmail);

    // Check if user already exists in database
    const { data: existingUser } = await supabaseAdmin
      .from('User')
      .select('UserID, Email')
      .ilike('Email', candidateEmail.trim())
      .single();

    if (existingUser) {
      console.log('User already exists:', existingUser.UserID);
      return { success: true, userId: existingUser.UserID };
    }

    // Generate unique UserID and temporary password
    const userId = await generateUserId(new Date()); // Use current date as hire date
    const temporaryPassword = generateTemporaryPassword();
    console.log('Generated UserID:', userId);

    // Create User record in database with 'employee' role by default
    const { data: newUser, error: userError } = await supabaseAdmin
      .from('User')
      .insert({
        UserID: userId,
        Email: candidateEmail.toLowerCase().trim(),
        FirstName: firstName,
        LastName: lastName,
        Status: 'Active',
        RequirePasswordChange: true, // Flag to force password change on first login
        DateCreated: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        PasswordHash: crypto.createHash('sha256').update(crypto.randomBytes(32).toString('hex')).digest('hex')
      })
      .select()
      .single();

    if (userError) {
      console.error('Error creating user:', userError);
      return { success: false, error: `Failed to create user: ${userError.message}` };
    }

    console.log('User created successfully:', userId);

    // Assign 'employee' role to the user
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('Role')
      .select('id, name')
      .ilike('name', 'employee')
      .single();

    if (roleError) {
      console.error('Error finding employee role:', roleError);
      // Continue even if role assignment fails
    } else {
      const { error: userRoleError } = await supabaseAdmin
        .from('UserRole')
        .insert({
          userId: userId,
          roleId: roleData.id
        });

      if (userRoleError) {
        console.error('Error assigning employee role:', userRoleError);
        // Continue even if role assignment fails
      } else {
        console.log('Employee role assigned successfully');
      }
    }

    // Create Clerk user directly with password (not invitation)
    let clerkUserId: string | undefined;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        // Create Clerk user with password
        const clerkUser = await clerk.users.createUser({
          emailAddress: [candidateEmail.toLowerCase().trim()],
          password: temporaryPassword,
          firstName: firstName,
          lastName: lastName,
          publicMetadata: {
            userId: userId,
            role: 'employee',
            candidateId: candidateId
          },
          skipPasswordChecks: false, // Ensure password meets requirements
          skipPasswordRequirement: false
        });
        
        clerkUserId = clerkUser.id;
        console.log('Clerk user created successfully:', clerkUserId);
        break;
      } catch (clerkError: any) {
        retryCount++;
        console.log(`Clerk user creation attempt ${retryCount} failed:`, clerkError.message);
        
        if (clerkError.message?.includes('already exists') || clerkError.message?.includes('email_address_exists')) {
          if (retryCount < maxRetries) {
            // Try to clean up orphaned Clerk accounts
            try {
              const existingClerkUsers = await clerk.users.getUserList({
                emailAddress: [candidateEmail.toLowerCase().trim()]
              });
              
              if (existingClerkUsers.data && existingClerkUsers.data.length > 0) {
                const existingClerkUser = existingClerkUsers.data[0];
                await clerk.users.deleteUser(existingClerkUser.id);
                console.log('Deleted orphaned Clerk account during retry');
                await new Promise(resolve => setTimeout(resolve, 2000));
                continue;
              }
            } catch (cleanupError) {
              console.error('Failed to cleanup during retry:', cleanupError);
            }
          }
          
          if (retryCount >= maxRetries) {
            return { 
              success: false, 
              error: 'An authentication account with this email already exists. Please contact IT support.' 
            };
          }
        } else {
          return { success: false, error: clerkError.message };
        }
      }
    }

    if (!clerkUserId) {
      return { success: false, error: 'Failed to create Clerk user after retries' };
    }

    // Update user record with Clerk ID
    const { error: updateError } = await supabaseAdmin
      .from('User')
      .update({
        ClerkID: clerkUserId,
        DateModified: new Date().toISOString()
      })
      .eq('UserID', userId);

    if (updateError) {
      console.error('Error updating user with Clerk ID:', updateError);
      // Try to delete the Clerk user if database update fails
      try {
        await clerk.users.deleteUser(clerkUserId);
      } catch (deleteError) {
        console.error('Failed to delete Clerk user:', deleteError);
      }
      return { success: false, error: `Failed to update user: ${updateError.message}` };
    }

    console.log('User account and Clerk user created successfully for:', candidateEmail);
    return { success: true, userId, temporaryPassword };

  } catch (error: any) {
    console.error('Error in createUserAccountForHiredEmployee:', error);
    return { success: false, error: error.message || 'Unknown error occurred' };
  }
}


export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  // Ensure id exists
  if (!id) {
    return NextResponse.json(
      { error: 'Candidate ID is required' },
      { status: 400 }
    );
  }
  
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Ensure id exists
    if (!id) {
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
    const Email = formData.get('Email') as string;
    const ContactNumber = formData.get('ContactNumber') as string;
    const DateOfBirth = formData.get('DateOfBirth') as string;
    const InterviewDate = formData.get('InterviewDate') as string;
    const Status = formData.get('Status') as string;
    const resume = formData.get('resume') as File | null;
    const Sex = formData.get('Sex') as string;
    const VacancyID = formData.get('VacancyID') as string;
    const EmployeeInfoSubmitted = formData.get('EmployeeInfoSubmitted');
    const ResetSubmittedInfo = formData.get('ResetSubmittedInfo') === 'true';

    // Generate FullName from component parts
    const FullName = [LastName, FirstName, MiddleName, ExtensionName]
      .filter(Boolean)
      .join(' ')
      .trim();

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
      .eq('CandidateID', id)
      .single();

    // Get the vacancy name for email notifications
    const { data: vacancy } = await supabaseAdmin
      .from('Vacancy')
      .select('VacancyName')
      .eq('VacancyID', VacancyID)
      .single();

    const vacancyName = vacancy?.VacancyName || '';

    // Generate token if status is changing to "Offered"
    let token: string | null = null;
    let tokenExpiry: Date | null = null;
    
    if (Status === 'Offered' && Status !== currentCandidate?.Status) {
      // Generate a secure random token
      token = crypto.randomBytes(32).toString('hex');
      // Set token expiry to 30 days from now
      tokenExpiry = new Date();
      tokenExpiry.setDate(tokenExpiry.getDate() + 30);
    }

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

    // Handle resetting submitted employee info
    if (ResetSubmittedInfo) {
      updateData.EmployeeInfoSubmitted = false;
      updateData.EmployeeInfoSubmittedDate = null;
      updateData.SubmittedEmployeeInfo = null;
    } else if (EmployeeInfoSubmitted !== null) {
      updateData.EmployeeInfoSubmitted = EmployeeInfoSubmitted === 'true';
    }

    // Add token and token expiry if status is "Offered"
    if (token && tokenExpiry) {
      updateData.Token = token;
      updateData.TokenExpiry = tokenExpiry.toISOString();
    }

    // Handle resume upload if provided
    if (resume) {
      try {
        const timestamp = Date.now();
        const fileName = `${timestamp}_${resume.name}`;
        
        // Convert File to buffer
        const buffer = await resume.arrayBuffer();
        const fileBuffer = Buffer.from(buffer);

        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from('resumes')
          .upload(fileName, fileBuffer, {
            contentType: resume.type,
            upsert: false
          });

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

        updateData.Resume = uploadData.path;
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
      .eq('CandidateID', id)
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
        // Format name for email: FirstName MiddleInitial. LastName
        const formattedName = formatNameForEmail(FirstName, LastName, MiddleName, ExtensionName);
        
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
            html: generateInterviewScheduleEmail(formattedName, vacancyName, formattedInterviewDate)
          });
        } 
        // For "Offered" status, send email with token link
        else if (Status === 'Offered') {
          // Get the token from the updated candidate record
          const candidateToken = candidate?.Token || token;
          if (candidateToken) {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL 
              ? `https://${process.env.VERCEL_URL}` 
              : 'https://hrms-v2-azure.vercel.app');
            const offerLink = `${baseUrl}/offered-applicant/${candidateToken}`;
            
            await sendEmail({
              to: Email,
              subject: 'Application Status Update - Saint Joseph School of Fairview Inc.',
              html: generateStatusUpdateEmail(formattedName, vacancyName, Status, offerLink)
            });
          } else {
            // Fallback if token wasn't generated
            await sendEmail({
              to: Email,
              subject: 'Application Status Update - Saint Joseph School of Fairview Inc.',
              html: generateStatusUpdateEmail(formattedName, vacancyName, Status)
            });
          }
        }
        // For "Hired" status, create User account and Clerk user with credentials
        else if (Status === 'Hired') {
          let accountCreated = false;
          let temporaryPassword = '';
          
          // Create User account and Clerk user for the hired employee
          const userCreationResult = await createUserAccountForHiredEmployee(
            Email,
            FirstName,
            LastName,
            parseInt(id)
          );

          if (userCreationResult.success) {
            console.log('User account created successfully for hired employee');
            accountCreated = true;
            temporaryPassword = userCreationResult.temporaryPassword || '';
            
            // Update candidate with UserID if created
            if (userCreationResult.userId) {
              await supabaseAdmin
                .from('Candidate')
                .update({ UserID: userCreationResult.userId })
                .eq('CandidateID', id);
            }
          } else {
            console.error('Failed to create user account:', userCreationResult.error);
            // Continue to send email even if account creation fails
          }

          // Send hired status email with account credentials
          await sendEmail({
            to: Email,
            subject: 'Welcome to Saint Joseph School of Fairview Inc. - Your Account Credentials',
            html: generateStatusUpdateEmail(
              formattedName, 
              vacancyName, 
              Status, 
              undefined, 
              accountCreated,
              temporaryPassword,
              Email
            )
          });
        }
        // For all other status changes, send the status update email
        else {
          await sendEmail({
            to: Email,
            subject: 'Application Status Update - Saint Joseph School of Fairview Inc.',
            html: generateStatusUpdateEmail(formattedName, vacancyName, Status)
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
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  // Ensure id exists
  if (!id) {
    return NextResponse.json(
      { error: 'Candidate ID is required' },
      { status: 400 }
    );
  }
  
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